import sys,sqlite3,unittest,json
from pathlib import Path
from datetime import datetime,timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from acompanhamento import preparar,ciclo,avancar,perfil
class Acompanhamento(unittest.TestCase):
 def setUp(self):
  self.c=sqlite3.connect(':memory:');self.c.row_factory=sqlite3.Row
  self.c.executescript('CREATE TABLE contas(id INTEGER PRIMARY KEY,email TEXT);CREATE TABLE respostas(conta INTEGER,questao INTEGER,acerto INTEGER,criada REAL);')
  preparar(self.c)
  self.q=[{'id':1,'area':'Linguagens','materia':'Português','topico':'Texto'},{'id':2,'area':'Matemática','materia':'Matemática','topico':'Números'}]
 def test_ciclo_persistencia_ordem_e_duplicacao(self):
  self.assertEqual(ciclo(self.c,1,self.q)['proxima'],1)
  self.assertFalse(avancar(self.c,1,2,self.q))
  self.assertFalse(avancar(self.c,1,1,self.q));self.assertFalse(avancar(self.c,1,1,self.q))
  self.assertEqual(ciclo(self.c,1,self.q)['feitas'],1)
  self.assertEqual(ciclo(self.c,2,self.q)['feitas'],0)
  self.assertTrue(avancar(self.c,1,2,self.q))
  self.assertEqual(ciclo(self.c,1,self.q)['concluidas'],1)
 def test_catalogo_removido_nao_completa(self):
  ciclo(self.c,1,self.q)
  self.assertTrue(ciclo(self.c,1,self.q[1:])['bloqueada'])
  self.assertEqual(ciclo(self.c,1,self.q[1:])['concluidas'],0)
 def test_media_semanal_privacidade(self):
  for i in range(1,7):
   self.c.execute('INSERT INTO contas VALUES(?,?)',(i,'teste' if i==6 else str(i)))
   self.c.execute('INSERT INTO respostas VALUES(?,?,?,?)',(i,1,int(i!=1),1))
  p=perfil(self.c,1,self.q,datetime(2026,11,9,tzinfo=timezone.utc))
  self.assertEqual(p['mediaGeral'],80);self.assertEqual(p['assuntos'][0]['erros'],1)
  self.c.execute('INSERT INTO respostas VALUES(1,1,0,1)')
  self.assertEqual(perfil(self.c,1,self.q,datetime(2026,11,10,tzinfo=timezone.utc))['mediaGeral'],80)
  self.assertNotEqual(perfil(self.c,1,self.q,datetime(2026,11,16,tzinfo=timezone.utc))['atualizada'],p['atualizada'])
if __name__=='__main__':unittest.main()
