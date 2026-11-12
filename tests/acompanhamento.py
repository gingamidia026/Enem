import sys,sqlite3,unittest,json
from pathlib import Path
from datetime import datetime,timezone,timedelta
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from acompanhamento import preparar,ciclo,avancar,perfil,estudo,indice,ordem_intercalada,FUSO
class Acompanhamento(unittest.TestCase):
 def setUp(self):
  self.c=sqlite3.connect(':memory:');self.c.row_factory=sqlite3.Row
  self.c.executescript('CREATE TABLE contas(id INTEGER PRIMARY KEY,email TEXT);CREATE TABLE respostas(conta INTEGER,questao INTEGER,acerto INTEGER,criada REAL);')
  preparar(self.c)
  self.q=[{'id':1,'area':'Linguagens','materia':'Português','topico':'Texto'},{'id':2,'area':'Matemática','materia':'Matemática','topico':'Números'}]
 def test_ciclo_persistencia_sem_ordem_fixa_e_duplicacao(self):
  self.assertEqual(ciclo(self.c,1,self.q)['proxima'],1)
  # Foco por matéria: responder fora da ordem conta na densidade; repetir não conta duas vezes.
  self.assertFalse(avancar(self.c,1,2,self.q));self.assertFalse(avancar(self.c,1,2,self.q))
  self.assertEqual(ciclo(self.c,1,self.q)['feitas'],1)
  self.assertEqual(ciclo(self.c,1,self.q)['pendentes'],[1])
  self.assertEqual(ciclo(self.c,2,self.q)['feitas'],0)
  self.assertFalse(avancar(self.c,1,99,self.q))
  self.assertTrue(avancar(self.c,1,1,self.q))
  self.assertEqual(ciclo(self.c,1,self.q)['concluidas'],1)
  self.assertEqual(ciclo(self.c,1,self.q)['feitas'],0)
 def test_catalogo_removido_nao_completa(self):
  ciclo(self.c,1,self.q)
  restante=self.q[1:]
  self.assertEqual(ciclo(self.c,1,restante)['removidas'],1)
  self.assertFalse(ciclo(self.c,1,restante)['bloqueada'])
  self.assertFalse(avancar(self.c,1,2,restante))
  self.assertTrue(ciclo(self.c,1,restante)['bloqueada'])
  self.assertIsNone(ciclo(self.c,1,restante)['proxima'])
  self.assertEqual(ciclo(self.c,1,restante)['concluidas'],0)
 def test_ordem_intercalada_proporcional(self):
  q=[{'id':i,'area':'L','materia':'Português','topico':'T'} for i in range(1,5)]+[{'id':i,'area':'M','materia':'Matemática','topico':'N'} for i in range(5,13)]+[{'id':13,'area':'N','materia':'Física','topico':'F'}]
  ordem=ordem_intercalada(q)
  self.assertEqual(sorted(ordem),list(range(1,14)));self.assertEqual(ordem[0],1)
  materias=['P' if i<5 else 'M' if i<13 else 'F' for i in ordem]
  # Nenhuma matéria aparece em bloco: no máximo duas seguidas da matéria com mais questões.
  self.assertNotIn('MMM',''.join(materias));self.assertNotIn('PP',''.join(materias))
  self.assertEqual(ordem_intercalada([]),[])
  # Dentro da matéria os assuntos também se alternam, sem bloco de um assunto só.
  q=[{'id':i,'area':'M','materia':'Matemática','topico':'Álgebra' if i<=4 else 'Geometria'} for i in range(1,9)]
  assuntos=''.join('A' if i<=4 else 'G' for i in ordem_intercalada(q))
  self.assertNotIn('AA',assuntos);self.assertNotIn('GG',assuntos)
 def test_revisao_espacada_e_ritmo(self):
  agora=datetime(2026,11,12,15,0,tzinfo=FUSO)
  dia=lambda n,hora=10:(agora-timedelta(days=n)).replace(hour=hora).timestamp()
  por=lambda questao,acerto,quando,chute=0:self.c.execute('INSERT INTO respostas(conta,questao,acerto,criada,chute) VALUES(1,?,?,?,?)',(questao,acerto,quando,chute))
  por(1,0,dia(0))
  e=estudo(self.c,1,self.q,agora)
  self.assertEqual(e['hoje'],{'respostas':1,'acertos':0});self.assertEqual(e['revisao'],{'vencidas':[],'caderno':1,'intervalos':[1,3,7]})
  self.assertEqual(e['semana'][e['diaDaSemana']],1);self.assertEqual(sum(e['semana']),1)
  # No dia seguinte o erro vence; acerto seguro adia três dias; chute certo volta ao começo.
  amanha=agora+timedelta(days=1)
  self.assertEqual(estudo(self.c,1,self.q,amanha)['revisao']['vencidas'],[1])
  por(1,1,amanha.timestamp())
  self.assertEqual(estudo(self.c,1,self.q,amanha+timedelta(days=2))['revisao']['vencidas'],[])
  self.assertEqual(estudo(self.c,1,self.q,amanha+timedelta(days=3))['revisao']['vencidas'],[1])
  por(2,1,dia(2),1)
  e=estudo(self.c,1,self.q,agora)
  self.assertEqual(e['revisao']['vencidas'],[2]);self.assertEqual(e['revisao']['caderno'],2)
  # Três acertos seguros seguidos tiram a questão da revisão; quem nunca errou não entra.
  # Acerto adiantado (mesmo dia ou antes do prazo) não sobe de nível nem adia a revisão.
  vence=lambda dias:1 in estudo(self.c,1,self.q,amanha+timedelta(days=dias))['revisao']['vencidas']
  por(1,1,(amanha+timedelta(days=1)).timestamp());por(1,1,(amanha+timedelta(days=2)).timestamp())
  self.assertFalse(vence(2));self.assertTrue(vence(3))
  por(1,1,(amanha+timedelta(days=4)).timestamp())
  self.assertFalse(vence(10));self.assertTrue(vence(11))
  # Três acertos seguros no prazo tiram a questão do caderno; quem nunca errou não entra.
  por(1,1,(amanha+timedelta(days=11)).timestamp())
  self.assertFalse(vence(60));self.assertEqual(estudo(self.c,1,self.q,amanha+timedelta(days=60))['revisao']['caderno'],1)
  # Errar depois de dominar devolve a questão ao caderno.
  por(1,0,(amanha+timedelta(days=30)).timestamp())
  self.assertTrue(vence(31))
  self.assertEqual(estudo(self.c,2,self.q,agora)['revisao']['caderno'],0)
  # Questão fora do catálogo não aparece na revisão.
  self.assertEqual(estudo(self.c,1,self.q[:1],agora)['revisao']['vencidas'],[])
 def test_indice_sem_gabarito(self):
  q=[dict(self.q[0],enunciado='Curta',alternativas=['a','b'],correta=1,explicacao='x'),dict(self.q[1],enunciado='x'*2000,alternativas=['a'],correta=0)]
  i=indice(q);texto=json.dumps(i)
  self.assertEqual(i['curtas'],[1]);self.assertNotIn('correta',texto);self.assertNotIn('Curta',texto)
  self.assertEqual(i['materias'][0],{'nome':'Português','area':'Linguagens','topicos':[{'nome':'Texto','ids':[1]}]})
 def test_media_semanal_privacidade(self):
  for i in range(1,7):
   self.c.execute('INSERT INTO contas VALUES(?,?)',(i,'teste' if i==6 else str(i)))
   self.c.execute('INSERT INTO respostas(conta,questao,acerto,criada) VALUES(?,?,?,?)',(i,1,int(i!=1),1))
  p=perfil(self.c,1,self.q,datetime(2026,11,9,tzinfo=timezone.utc))
  self.assertEqual(p['mediaGeral'],80);self.assertEqual(p['assuntos'][0]['erros'],1)
  self.c.execute('INSERT INTO respostas(conta,questao,acerto,criada) VALUES(1,1,0,1)')
  self.assertEqual(perfil(self.c,1,self.q,datetime(2026,11,10,tzinfo=timezone.utc))['mediaGeral'],80)
  self.assertNotEqual(perfil(self.c,1,self.q,datetime(2026,11,16,tzinfo=timezone.utc))['atualizada'],p['atualizada'])
if __name__=='__main__':unittest.main()
