"""Consulta apenas a fila ENEM por HTTPS. Sem servidor, terminal ou acesso ao banco."""
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.cookies import SimpleCookie

REMOTO = os.environ.get('ENEM_INTERMEDIARIO', '').rstrip('/')
CHAVE = ''
ORIGEM = os.environ.get('ORIGEM', 'http://localhost:8088')
# Parado, consulta a cada 2 s (metade dos pedidos de antes); com alguém estudando, pausa de 0,25 s por 20 s.
# Cada consulta ao intermediário leva perto de meio segundo por conta do banco dele; a pausa soma a isso.
PAUSA_ATIVA, PAUSA_PARADA, JANELA_ATIVA = 0.25, 2.0, 20.0

def permitido(metodo, caminho):
    return ((metodo == 'GET' and caminho in ['/api/configuracao', '/api/painel', '/api/dispositivos'])
            or (metodo == 'POST' and caminho in ['/api/entrar', '/api/cadastro', '/api/sair', '/api/dispositivos'])
            or (metodo in ['GET', 'POST'] and re.fullmatch(r'/api/questoes/[1-9][0-9]{0,5}', caminho)))

def remoto(rota, dados):
    req = urllib.request.Request(REMOTO + rota, data=json.dumps(dados).encode(), headers={
        'Authorization': 'Bearer ' + CHAVE, 'Content-Type': 'application/json', 'User-Agent': 'ENEM-Conector/1.0'})
    with urllib.request.urlopen(req, timeout=12) as resposta:
        return json.load(resposta)

def executar(pedido):
    metodo, caminho = pedido.get('metodo'), pedido.get('caminho', '')
    if not permitido(metodo, caminho):
        return {'status': 403, 'dados': {'erro': 'Operação não permitida.'}}
    token = pedido.get('token', '')
    if token and not re.fullmatch(r'[A-Za-z0-9_-]{20,100}', token):
        return {'status': 400, 'dados': {'erro': 'Sessão inválida.'}}
    corpo = None
    if metodo == 'POST':
        corpo = json.dumps(pedido.get('dados', {})).encode()
        if len(corpo) > 16384:
            return {'status': 413, 'dados': {'erro': 'Pedido muito grande.'}}
    req = urllib.request.Request('http://aplicacao:8000' + caminho, data=corpo, method=metodo,
        headers={'Origin': ORIGEM, 'Content-Type': 'application/json', 'Cookie': 'sessao=' + token})
    try:
        resposta = urllib.request.urlopen(req, timeout=8)
    except urllib.error.HTTPError as erro:
        resposta = erro
    with resposta:
        dados = json.load(resposta)
        if caminho == '/api/entrar' or caminho == '/api/cadastro':
            cookie = SimpleCookie()
            cookie.load(resposta.headers.get('Set-Cookie', ''))
            if 'sessao' in cookie:
                dados['sessao'] = cookie['sessao'].value
        return {'status': resposta.status, 'dados': dados}

def atender(pedido):
    try:
        resultado = executar(pedido)
    except Exception:
        resultado = {'status': 502, 'dados': {'erro': 'A aplicação não respondeu. Tente novamente.'}}
    try:
        remoto('/conector/responder', {'id': pedido['id'], **resultado})
    except Exception:
        # O navegador recebe indisponibilidade pelo prazo do pedido; nada sensível vai ao registro.
        print('Resposta não entregue ao intermediário.', flush=True)

def principal():
    global CHAVE
    if not re.fullmatch(r'https://[a-zA-Z0-9.-]+', REMOTO):
        raise ValueError('Intermediário precisa de uma origem HTTPS, sem caminhos.')
    CHAVE = Path('/run/secrets/chave').read_text().strip()
    print('Conector ENEM iniciado: somente conexões de saída; sem dados de pessoas nos registros.', flush=True)
    ultimo_pedido = 0.0
    # Seis pedidos por vez: as partes de uma figura não esperam uma pela outra.
    with ThreadPoolExecutor(max_workers=6) as atendentes:
        while True:
            try:
                fila = remoto('/conector/retirar', {})
                pedidos = fila.get('pedidos', [])
                if pedidos:
                    ultimo_pedido = time.monotonic()
                    for pedido in pedidos:
                        atendentes.submit(atender, pedido)
                # Com alguém estudando, consulta a fila mais vezes; parado, poupa a cota do intermediário.
                time.sleep(PAUSA_ATIVA if time.monotonic() - ultimo_pedido < JANELA_ATIVA else PAUSA_PARADA)
            except Exception:
                # Não imprimir URL completa, chave, sessão, pedidos ou respostas.
                print('Conexão temporariamente indisponível; nova tentativa em cinco segundos.', flush=True)
                time.sleep(5)

if __name__ == '__main__':
    principal()
