"""API restrita: nenhum caminho ou comando fornecido pelo navegador é executado."""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from questoes import QUESTOES

DADOS = Path(os.environ.get('DADOS', '/dados'))
DADOS.mkdir(parents=True, exist_ok=True)
os.chmod(DADOS, 0o700)
BANCO = DADOS / 'estudos.sqlite3'
ORIGEM = os.environ.get('ORIGEM', 'http://localhost:8088')
SEGURO = os.environ.get('COOKIE_SEGURO', '0') == '1'
PUBLICO = Path(__file__).parent / 'public'

def banco():
    con = sqlite3.connect(BANCO, timeout=15)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    return con

with banco() as con:
    con.executescript('''
    CREATE TABLE IF NOT EXISTS contas(id INTEGER PRIMARY KEY, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, sal TEXT NOT NULL, senha TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessoes(token TEXT PRIMARY KEY, conta INTEGER REFERENCES contas(id), expira REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS respostas(id INTEGER PRIMARY KEY, conta INTEGER REFERENCES contas(id), questao INTEGER NOT NULL, alternativa INTEGER NOT NULL, acerto INTEGER NOT NULL, criada REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS limites(chave TEXT PRIMARY KEY, inicio REAL NOT NULL, total INTEGER NOT NULL);
    ''')
os.chmod(BANCO, 0o600)

def resumo(senha, sal):
    return hashlib.scrypt(senha.encode(), salt=bytes.fromhex(sal), n=16384, r=8, p=1).hex()

def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()

class Erro(Exception):
    def __init__(self, status, mensagem):
        self.status, self.mensagem = status, mensagem

class Servidor(ThreadingHTTPServer):
    daemon_threads = True
    vagas = threading.BoundedSemaphore(32)
    def process_request(self, request, client_address):
        self.vagas.acquire()
        try:
            super().process_request(request, client_address)
        except Exception:
            self.vagas.release()
            raise
    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.vagas.release()

class API(BaseHTTPRequestHandler):
    server_version = 'Estudos'
    sys_version = ''
    def setup(self):
        super().setup()
        self.connection.settimeout(15)
    def log_message(self, formato, *args):
        # Não registrar corpo, cookies, nomes ou e-mails.
        pass
    def enviar(self, status, dado, tipo='application/json; charset=utf-8', cookie=None):
        corpo = json.dumps(dado, ensure_ascii=False).encode() if tipo.startswith('application/json') else dado
        self.send_response(status)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(corpo)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        if SEGURO:
            self.send_header('Strict-Transport-Security', 'max-age=31536000')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(corpo)
    def token(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
            return cookie['sessao'].value if 'sessao' in cookie else ''
        except Exception:
            return ''
    def conta(self, con):
        conta = con.execute('SELECT c.id,c.nome FROM contas c JOIN sessoes s ON s.conta=c.id WHERE s.token=? AND s.expira>?', (digest(self.token()), time.time())).fetchone()
        if not conta:
            raise Erro(401, 'Entre na sua conta para continuar.')
        return dict(conta)
    def limitar(self, con, chave, limite):
        agora = time.time()
        con.execute('DELETE FROM limites WHERE inicio<?', (agora - 900,))
        con.execute('INSERT INTO limites VALUES(?,?,1) ON CONFLICT(chave) DO UPDATE SET total=total+1', (chave, agora))
        total = con.execute('SELECT total FROM limites WHERE chave=?', (chave,)).fetchone()[0]
        con.commit()
        if total > limite:
            raise Erro(429, 'Muitas tentativas. Aguarde 15 minutos.')
    def executar(self, metodo):
        try:
            self.rota(metodo)
        except Erro as erro:
            self.enviar(erro.status, {'erro': erro.mensagem})
        except (ValueError, TypeError, KeyError, UnicodeDecodeError):
            self.enviar(400, {'erro': 'Dados inválidos. Confira os campos.'})
        except Exception:
            self.enviar(500, {'erro': 'Não foi possível concluir. Tente novamente.'})
    def do_GET(self):
        self.executar('GET')
    def do_POST(self):
        self.executar('POST')
    def rota(self, metodo):
        caminho = self.path.split('?')[0]
        if metodo == 'GET' and caminho in ['/', '/app.js', '/estilo.css']:
            arquivo = PUBLICO / {'/': 'index.html', '/app.js': 'app.js', '/estilo.css': 'estilo.css'}[caminho]
            tipo = {'/': 'text/html; charset=utf-8', '/app.js': 'text/javascript; charset=utf-8', '/estilo.css': 'text/css; charset=utf-8'}[caminho]
            return self.enviar(200, arquivo.read_bytes(), tipo)
        if metodo == 'GET' and caminho == '/api/saude':
            return self.enviar(200, {'estado': 'ok'})
        dados = {}
        if metodo == 'POST':
            if self.headers.get('Origin') != ORIGEM:
                raise Erro(403, 'Origem não autorizada.')
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                raise Erro(415, 'Envie dados no formato JSON.')
            tamanho = int(self.headers.get('Content-Length', '0'))
            if tamanho < 1 or tamanho > 16384:
                raise Erro(413, 'Pedido excede o tamanho permitido.')
            dados = json.loads(self.rfile.read(tamanho))
            if not isinstance(dados, dict):
                raise Erro(400, 'Envie um objeto JSON.')
        with banco() as con:
            if metodo == 'POST' and caminho in ['/api/cadastro', '/api/entrar']:
                self.limitar(con, 'autenticacao', 100)
                email = dados.get('email', '')
                if not isinstance(email, str):
                    raise Erro(400, 'Informe um e-mail válido.')
                email = email.strip().lower()
                senha = dados.get('senha', '')
                if not isinstance(senha, str) or not re.fullmatch(r'[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{2,30}', email) or not 12 <= len(senha) <= 128:
                    raise Erro(400, 'Informe e-mail válido e senha com 12 a 128 caracteres.')
                self.limitar(con, 'email:' + digest(email), 10)
                if caminho == '/api/cadastro':
                    nome = dados.get('nome', '')
                    if not isinstance(nome, str):
                        raise Erro(400, 'Informe um nome válido.')
                    nome = nome.strip()
                    if not 2 <= len(nome) <= 80:
                        raise Erro(400, 'O nome deve ter de 2 a 80 caracteres.')
                    sal = secrets.token_hex(16)
                    try:
                        con.execute('INSERT INTO contas(nome,email,sal,senha) VALUES(?,?,?,?)', (nome, email, sal, resumo(senha, sal)))
                        con.commit()
                    except sqlite3.IntegrityError:
                        raise Erro(400, 'Não foi possível cadastrar. Confira os dados ou entre na sua conta.')
                conta = con.execute('SELECT * FROM contas WHERE email=?', (email,)).fetchone()
                sal = conta['sal'] if conta else '0' * 32
                valido = hmac.compare_digest(resumo(senha, sal), conta['senha'] if conta else '0' * 128)
                if not conta or not valido:
                    raise Erro(401, 'E-mail ou senha incorretos.')
                token = secrets.token_urlsafe(32)
                con.execute('DELETE FROM sessoes WHERE expira<? OR token=?', (time.time(), digest(self.token())))
                con.execute('INSERT INTO sessoes VALUES(?,?,?)', (digest(token), conta['id'], time.time() + 86400))
                con.commit()
                cookie = f'sessao={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400' + ('; Secure' if SEGURO else '')
                return self.enviar(200, {'nome': conta['nome']}, cookie=cookie)
            conta = self.conta(con)
            if metodo == 'POST' and caminho == '/api/sair':
                con.execute('DELETE FROM sessoes WHERE token=?', (digest(self.token()),))
                con.commit()
                return self.enviar(200, {'ok': True}, cookie='sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' + ('; Secure' if SEGURO else ''))
            if metodo == 'GET' and caminho == '/api/painel':
                totais = con.execute('SELECT COUNT(*) total,COALESCE(SUM(acerto),0) acertos FROM respostas WHERE conta=?', (conta['id'],)).fetchone()
                return self.enviar(200, {'conta': conta, 'progresso': dict(totais), 'questoes': [{k: q[k] for k in ['id', 'area', 'titulo']} for q in QUESTOES]})
            partes = re.fullmatch(r'/api/questoes/([0-9]+)', caminho)
            if partes:
                questao = next((q for q in QUESTOES if q['id'] == int(partes[1])), None)
                if not questao:
                    raise Erro(404, 'Questão não encontrada.')
                if metodo == 'GET':
                    return self.enviar(200, {k: v for k, v in questao.items() if k not in ['correta', 'explicacao']})
                alternativa = dados.get('alternativa')
                if type(alternativa) is not int or not 0 <= alternativa < len(questao['alternativas']):
                    raise Erro(400, 'Selecione uma alternativa válida.')
                self.limitar(con, 'respostas:' + str(conta['id']), 200)
                acerto = alternativa == questao['correta']
                con.execute('INSERT INTO respostas(conta,questao,alternativa,acerto,criada) VALUES(?,?,?,?,?)', (conta['id'], questao['id'], alternativa, acerto, time.time()))
                con.commit()
                return self.enviar(200, {'acerto': acerto, 'correta': questao['correta'], 'explicacao': questao['explicacao']})
            raise Erro(404, 'Página não encontrada.')

if __name__ == '__main__':
    Servidor(('0.0.0.0', int(os.environ.get('PORTA', '8000'))), API).serve_forever()
