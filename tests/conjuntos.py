"""Integração HTTP: conjunto completo, atomicidade, repetição e contagem individual."""
from sincronizacao import Testes as Base
import json
import os
import socket
import subprocess
import time
import unittest
import urllib.error
import urllib.request
import http.cookiejar

class Conjuntos(Base):
 def setUp(self):
  super().setUp()
  for n in (1,2):
   p=self.nota(n);s=p.read_text().replace('gabarito: C','gabarito: C\nextrator: 2\ngrupo: "teste:Q01a02"')
   s=s.replace('## Texto\n','## Texto comum\nTexto longo compartilhado.\n## Texto\n')
   p.write_text(s)
 def test_grupo_sincronizado_e_incompleto_rejeitado(self):
  self.sync();qs=self.catalogo()['questoes'];self.assertEqual(qs[0]['grupoIds'],[q['id'] for q in qs])
  antes=(self.destino/'atual.json').read_bytes()
  (self.cofre/'Provas Enem/Questões/2025/2025-Q02.md').unlink()
  with self.assertRaises(ValueError):self.sync()
  self.assertEqual((self.destino/'atual.json').read_bytes(),antes)
 def test_envio_completo_atomico_e_repetido(self):
  from sincronizacao import RAIZ
  self.sync();ids=[q['id'] for q in self.catalogo()['questoes']]
  with socket.socket() as s:s.bind(('127.0.0.1',0));porta=s.getsockname()[1]
  origem=f'http://127.0.0.1:{porta}'
  proc=subprocess.Popen(['python3',str(RAIZ/'app/servidor.py')],env={**os.environ,'DADOS':str(self.raiz/'dados'),'PORTA':str(porta),'ORIGEM':origem,'CATALOGO':str(self.destino/'atual.json')},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  cliente=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
  def pedido(caminho,dados=None):
   req=urllib.request.Request(origem+caminho,data=None if dados is None else json.dumps(dados).encode(),headers={'Origin':origem,'Content-Type':'application/json'})
   try:r=cliente.open(req)
   except urllib.error.HTTPError as e:r=e
   with r:return r.status,json.loads(r.read())
  try:
   for _ in range(100):
    try:urllib.request.urlopen(origem+'/api/saude',timeout=1).close();break
    except OSError:time.sleep(.05)
   self.assertEqual(pedido('/api/cadastro',{'nome':'Grupo','email':'grupo@example.com','senha':'Senha longa teste grupo 123!'})[0],200)
   status,q=pedido('/api/questoes/'+str(ids[0]));self.assertEqual(status,200)
   self.assertEqual(len(q['grupoQuestoes']),2)
   self.assertNotIn('correta',json.dumps(q));self.assertNotIn('explicacao',json.dumps(q))
   caminho='/api/questoes/'+str(ids[0]);envio='teste-conjunto-1234567890'
   for respostas in [[{'id':ids[0],'alternativa':2}],[{'id':ids[0],'alternativa':2}]*2,[{'id':ids[0],'alternativa':2},{'id':ids[1],'alternativa':8}]]:
    self.assertEqual(pedido(caminho,{'respostas':respostas,'envio':envio})[0],400)
    self.assertEqual(pedido('/api/painel')[1]['progresso']['total'],0)
   dados={'respostas':[{'id':ids[0],'alternativa':2},{'id':ids[1],'alternativa':0}],'envio':envio}
   status,r=pedido(caminho,dados);self.assertEqual(status,200,r)
   self.assertEqual(r['progresso'],{'total':2,'acertos':1});self.assertEqual(len(r['resultados']),2)
   self.assertTrue(r['densidadeConcluida']);self.assertEqual(r['acompanhamento']['densidade']['concluidas'],1)
   self.assertEqual(pedido(caminho,dados),(status,r))
   self.assertEqual(pedido('/api/painel')[1]['progresso']['total'],2)
   dados['respostas'][1]['alternativa']=1;self.assertEqual(pedido(caminho,dados)[0],400)
  finally:
   proc.terminate();proc.wait();proc.stderr.close()

# Os testes da base usam questões individuais, não as fixtures com conjunto.
for nome in list(Base.__dict__):
 if nome.startswith('test_'):setattr(Conjuntos,nome,None)
if __name__=='__main__':unittest.main(verbosity=2)
