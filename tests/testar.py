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
        cls.processo = subprocess.Popen(['python3', str(RAIZ/'app/servidor.py')], env={**os.environ, 'DADOS':cls.pasta.name, 'PORTA':str(porta), 'ORIGEM':cls.origem})
        for _ in range(100):
            try:
                urllib.request.urlopen(cls.origem+'/api/saude', timeout=1)
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
    def pedido(self, cliente, caminho, dados=None, origem=True):
        cabecalhos={'Origin':self.origem if origem else 'https://outro.example', 'Content-Type':'application/json'}
        req=urllib.request.Request(self.origem+caminho,data=None if dados is None else json.dumps(dados).encode(),headers=cabecalhos)
        try:
            resposta=cliente.open(req)
        except urllib.error.HTTPError as e:
            resposta=e
        return resposta.status, json.loads(resposta.read()), resposta.headers
    def cadastrar(self, cliente, nome):
        status,dados,cabecalhos=self.pedido(cliente,'/api/cadastro',{'nome':nome,'email':nome+'@example.com','senha':'Senha longa de teste 123!'})
        self.assertEqual(status,200,dados)
        self.assertIn('HttpOnly',cabecalhos['Set-Cookie'])
        self.assertIn('SameSite=Strict',cabecalhos['Set-Cookie'])
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

if __name__=='__main__':
    unittest.main(verbosity=2)
