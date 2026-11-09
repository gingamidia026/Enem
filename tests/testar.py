"""Integração real por HTTP, com banco temporário e duas contas independentes."""
import http.cookiejar
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import unittest
from contextlib import closing
import urllib.error
import urllib.request

RAIZ = Path(__file__).resolve().parents[1]
class Testes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pasta = tempfile.TemporaryDirectory()
        with socket.socket() as s:
            s.bind(('127.0.0.1', 0))
            porta = s.getsockname()[1]
        cls.origem = f'http://127.0.0.1:{porta}'
        cls.processo = subprocess.Popen(['python3', str(RAIZ/'app/servidor.py')], stdout=subprocess.DEVNULL, env={**os.environ, 'DADOS':cls.pasta.name, 'PORTA':str(porta), 'ORIGEM':getattr(cls, 'origem_cabecalho', cls.origem), 'PERFIL_TESTE':getattr(cls,'perfil','0'), **getattr(cls,'ambiente_extra',{})})
        for _ in range(100):
            try:
                with urllib.request.urlopen(cls.origem+'/api/saude', timeout=1):
                    pass
                break
            except OSError:
                time.sleep(.05)
        else:
            raise RuntimeError('Servidor não iniciou')
    @classmethod
    def tearDownClass(cls):
        cls.processo.terminate(); cls.processo.wait(); cls.pasta.cleanup()
    def cliente(self):
        return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def pedido(self, cliente, caminho, dados=None, origem=True, extras=None):
        cabecalhos={'Origin':getattr(self,'origem_cabecalho',self.origem) if origem else 'https://outro.example', 'Content-Type':'application/json', **(extras or {})}
        req=urllib.request.Request(self.origem+caminho,data=None if dados is None else json.dumps(dados).encode(),headers=cabecalhos)
        try:
            resposta=cliente.open(req)
        except urllib.error.HTTPError as e:
            resposta=e
        with resposta:
            return resposta.status, json.loads(resposta.read()), resposta.headers
    def cadastrar(self, cliente, nome):
        status,dados,cabecalhos=self.pedido(cliente,'/api/cadastro',{'nome':nome,'email':nome+'@example.com','senha':'Senha longa de teste 123!'})
        self.assertEqual(status,200,dados)
        self.assertIn('Max-Age=2592000',cabecalhos['Set-Cookie'])
        self.assertEqual(dados['painel']['conta']['nome'],nome)
        for questao in dados['painel']['questoes']:
            self.assertIn('enunciado',questao)
            self.assertIn('alternativas',questao)
            self.assertNotIn('correta',questao)
            self.assertNotIn('explicacao',questao)
        self.assertIn('HttpOnly',cabecalhos['Set-Cookie'])
        self.assertIn('SameSite=Strict',cabecalhos['Set-Cookie'])
    def test_entrada_pages_publicavel(self):
        from html.parser import HTMLParser
        pagina = (RAIZ/'index.html').read_text()
        class Recursos(HTMLParser):
            def handle_starttag(self, tag, atributos):
                dados = dict(atributos)
                if tag == 'link' and dados.get('rel') == 'stylesheet': self.css=dados['href']
                if tag == 'script' and dados.get('src'): self.scripts.append(dados['src'])
        recursos=Recursos();recursos.scripts=[];recursos.feed(pagina)
        self.assertTrue((RAIZ/urllib.parse.urlsplit(recursos.css).path).is_file())
        for script in recursos.scripts: self.assertTrue((RAIZ/urllib.parse.urlsplit(script).path).is_file())
        self.assertNotIn('localhost',pagina)
        self.assertNotIn('Abrir login neste computador',pagina)
        self.assertIn('data-publico="1"',pagina)
        self.assertTrue((RAIZ/'.nojekyll').exists())
    def test_conector_recusa_comandos_e_arquivos(self):
        import runpy
        conector=runpy.run_path(str(RAIZ/'conector/conector.py'))
        for metodo,caminho in [('GET','/etc/passwd'),('POST','/api/terminal'),('GET','http://outro.example/'),('GET','/api/questoes/../../dados'),('DELETE','/api/painel')]:
            self.assertFalse(conector['permitido'](metodo,caminho))
            self.assertEqual(conector['executar']({'metodo':metodo,'caminho':caminho})['status'],403)
        self.assertTrue(conector['permitido']('GET','/api/painel'))
        self.assertTrue(conector['permitido']('POST','/api/questoes/1'))
    def test_fluxo_e_isolamento(self):
        a,b=self.cliente(),self.cliente()
        self.assertEqual(self.pedido(a,'/api/painel')[0],401)
        self.cadastrar(a,'EstudanteA');self.cadastrar(b,'EstudanteB')
        status,q,_=self.pedido(a,'/api/questoes/1')
        self.assertEqual(status,200);self.assertNotIn('correta',q);self.assertNotIn('explicacao',q)
        for valor in [-1,5,True,'2',None]:
            self.assertEqual(self.pedido(a,'/api/questoes/1',{'alternativa':valor})[0],400)
        status,r,_=self.pedido(a,'/api/questoes/1',{'alternativa':2})
        self.assertEqual(status,200);self.assertTrue(r['acerto'])
        self.assertEqual(self.pedido(a,'/api/painel')[1]['progresso'],{'total':1,'acertos':1})
        self.assertEqual(self.pedido(b,'/api/painel')[1]['progresso'],{'total':0,'acertos':0})
        self.assertEqual(self.pedido(a,'/api/sair',{})[0],200)
        self.assertEqual(self.pedido(a,'/api/painel')[0],401)
        self.assertEqual(self.pedido(a,'/api/entrar',{'email':'EstudanteA@example.com','senha':'Senha longa de teste 123!'})[0],200)
        self.assertEqual(self.pedido(a,'/api/painel')[1]['progresso']['total'],1)
    def test_origem_caminhos_e_segredos(self):
        a=self.cliente()
        self.assertEqual(self.pedido(a,'/api/cadastro',{},origem=False)[0],403)
        for caminho in ['/dados/estudos.sqlite3','/.env','/../../etc/passwd','/api/terminal','/questoes.py']:
            self.assertIn(self.pedido(a,caminho)[0],[401,404])
        status,dados,cabecalhos=self.pedido(a,'/api/saude')
        self.assertEqual(status,200)
        self.assertEqual(cabecalhos['Cache-Control'],'no-store')
        self.assertIn("frame-ancestors 'none'",cabecalhos['Content-Security-Policy'])
    def test_senha_e_forca_bruta(self):
        a=self.cliente()
        self.assertEqual(self.pedido(a,'/api/cadastro',{'nome':'Teste','email':'teste@example.com','senha':'123'})[0],400)
        for _ in range(10):
            self.assertEqual(self.pedido(a,'/api/entrar',{'email':'inexistente@example.com','senha':'Senha longa de teste 123!'})[0],401)
        self.assertEqual(self.pedido(a,'/api/entrar',{'email':'inexistente@example.com','senha':'Senha longa de teste 123!'})[0],429)

class PerfilTeste(unittest.TestCase):
    perfil = '1'
    setUpClass = classmethod(Testes.setUpClass.__func__)
    tearDownClass = classmethod(Testes.tearDownClass.__func__)
    cliente = Testes.cliente
    pedido = Testes.pedido
    def test_login_teste_e_persistencia(self):
        cliente = self.cliente()
        self.assertTrue(self.pedido(cliente, '/api/configuracao')[1]['perfilTeste'])
        self.assertEqual(self.pedido(cliente, '/api/entrar', {'email':'teste','senha':'errada'})[0], 401)
        self.assertEqual(self.pedido(cliente, '/api/entrar', {'email':'teste','senha':'123'})[0], 200)
        self.assertEqual(self.pedido(cliente, '/api/painel')[1]['conta']['nome'], 'Teste')
        self.assertEqual(self.pedido(cliente, '/api/questoes/1', {'alternativa':2})[0], 200)
        self.processo.terminate(); self.processo.wait()
        self.__class__.processo = subprocess.Popen(['python3', str(RAIZ/'app/servidor.py')], env={**os.environ, 'DADOS':self.pasta.name, 'PORTA':self.origem.rsplit(':',1)[1], 'ORIGEM':self.origem, 'PERFIL_TESTE':'0'})
        for _ in range(100):
            try:
                with urllib.request.urlopen(self.origem+'/api/saude', timeout=1):
                    pass
                break
            except OSError:
                time.sleep(.05)
        self.assertFalse(self.pedido(cliente, '/api/configuracao')[1]['perfilTeste'])
        self.assertEqual(self.pedido(cliente, '/api/painel')[0], 401)
        self.assertNotEqual(self.pedido(cliente, '/api/entrar', {'email':'teste','senha':'123'})[0], 200)
        # O banco e o histórico permanecem presentes após desativar o perfil.
        import sqlite3
        with sqlite3.connect(Path(self.pasta.name)/'estudos.sqlite3') as con:
            self.assertEqual(con.execute('SELECT COUNT(*) FROM respostas').fetchone()[0], 1)
        con.close()

class Seguranca(unittest.TestCase):
    ambiente_extra = {'PROXY_CONFIAVEL':'1', 'COOKIE_SEGURO':'1', 'PRODUCAO':'1'}
    origem_cabecalho = 'https://enem.example'
    setUpClass = classmethod(Testes.setUpClass.__func__)
    tearDownClass = classmethod(Testes.tearDownClass.__func__)
    cliente = Testes.cliente
    pedido = Testes.pedido

    def requisicao(self, cliente, caminho, dados=None, ip='192.0.2.1', cookie=None):
        cabecalhos = {'X-ENEM-Cliente': ip}
        if cookie is not None: cabecalhos['Cookie'] = cookie
        return self.pedido(cliente, caminho, dados, extras=cabecalhos)

    def test_cookie_producao_expiracao_e_isolamento(self):
        import sqlite3
        cliente = self.cliente()
        tokens = []
        for i in range(2):
            status, dados, h = self.requisicao(cliente,'/api/cadastro',{'nome':f'Pessoa {i}','email':f'pessoa{i}@example.com','senha':'Senha longa segura 123!'},ip=f'192.0.2.{i+10}')
            self.assertEqual(status,200,dados)
            cookie = h['Set-Cookie']
            for parte in ['__Host-sessao=', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']:
                self.assertIn(parte, cookie)
            self.assertNotIn('sessao',dados)
            tokens.append(cookie.split(';')[0])
        self.assertEqual(self.requisicao(cliente,'/api/painel')[0],401)
        self.assertEqual(self.requisicao(cliente,'/api/questoes/1',{'alternativa':2,'conta':2},cookie=tokens[0])[0],200)
        self.assertEqual(self.requisicao(cliente,'/api/painel?conta=1',cookie=tokens[1])[1]['progresso']['total'],0)
        self.assertEqual(self.requisicao(cliente,'/api/painel',cookie=tokens[0])[1]['progresso']['total'],1)
        self.assertEqual(self.requisicao(cliente,'/api/painel',cookie='__Host-sessao=inventada')[0],401)
        # Em produção, o nome de cookie local não concede sessão.
        self.assertEqual(self.requisicao(cliente,'/api/painel',cookie=tokens[0].replace('__Host-sessao','sessao'))[0],401)
        self.assertEqual(self.requisicao(cliente,'/api/sair',{},cookie=tokens[0])[0],200)
        self.assertEqual(self.requisicao(cliente,'/api/painel',cookie=tokens[0])[0],401)
        with closing(sqlite3.connect(Path(self.pasta.name)/'estudos.sqlite3')) as con, con:
            con.execute('UPDATE sessoes SET expira=0')
        self.assertEqual(self.requisicao(cliente,'/api/painel',cookie=tokens[1])[0],401)

    def test_abuso_nao_bloqueia_outro_ip(self):
        cliente = self.cliente()
        for _ in range(10):
            self.assertEqual(self.requisicao(cliente,'/api/entrar',{'email':'alvo@example.com','senha':'Senha longa segura 123!'},ip='192.0.2.80')[0],401)
        self.assertEqual(self.requisicao(cliente,'/api/entrar',{'email':'alvo@example.com','senha':'Senha longa segura 123!'},ip='192.0.2.80')[0],429)
        self.assertEqual(self.requisicao(cliente,'/api/entrar',{'email':'alvo@example.com','senha':'Senha longa segura 123!'},ip='192.0.2.81')[0],401)
        for i in range(30):
            self.assertEqual(self.requisicao(cliente,'/api/entrar',{'email':f'outro{i}@example.com','senha':'Senha longa segura 123!'},ip='192.0.2.82')[0],401)
        status,_,h = self.requisicao(cliente,'/api/entrar',{'email':'fim@example.com','senha':'Senha longa segura 123!'},ip='192.0.2.82')
        self.assertEqual(status,429);self.assertIn('Retry-After',h)
        self.assertEqual(self.requisicao(cliente,'/api/entrar',{'email':'livre@example.com','senha':'Senha longa segura 123!'},ip='192.0.2.83')[0],401)

    def test_hash_antigo_atualizado_sem_perder_conta(self):
        import sqlite3,hashlib
        sal='aa'*16
        senha='Senha longa antiga 123!'
        antigo=hashlib.scrypt(senha.encode(),salt=bytes.fromhex(sal),n=16384,r=8,p=1).hex()
        with closing(sqlite3.connect(Path(self.pasta.name)/'estudos.sqlite3')) as con, con:
            con.execute('INSERT INTO contas(nome,email,sal,senha) VALUES(?,?,?,?)',('Legado','legado@example.com',sal,antigo))
        self.assertEqual(self.requisicao(self.cliente(),'/api/entrar',{'email':'legado@example.com','senha':senha},ip='192.0.2.90')[0],200)
        with closing(sqlite3.connect(Path(self.pasta.name)/'estudos.sqlite3')) as con, con:
            self.assertTrue(con.execute('SELECT senha FROM contas WHERE email=?',('legado@example.com',)).fetchone()[0].startswith('scrypt$32768$8$3$'))

if __name__=='__main__':
    unittest.main(verbosity=2)
