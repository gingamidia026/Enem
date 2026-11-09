"""Ciclos e perfil calculados exclusivamente no servidor. Dominique-Oliveira-ChatGPT🤖💚."""
import json
import time
import hashlib
from collections import defaultdict
from datetime import datetime, timezone, timedelta

def preparar(con):
    con.executescript('''
    CREATE TABLE IF NOT EXISTS ciclos(conta INTEGER PRIMARY KEY REFERENCES contas(id), concluidos INTEGER NOT NULL DEFAULT 0, ids TEXT NOT NULL, feitos TEXT NOT NULL DEFAULT '[]');
    CREATE TABLE IF NOT EXISTS envios(conta INTEGER REFERENCES contas(id), chave TEXT NOT NULL, questao INTEGER NOT NULL, alternativa INTEGER NOT NULL, resultado TEXT NOT NULL, PRIMARY KEY(conta,chave));
    CREATE TABLE IF NOT EXISTS medias(semana TEXT PRIMARY KEY, dados TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS respostas_conta ON respostas(conta);
    ''')

def materia(q):
    return q.get('materia') or q['area']

def assunto(q):
    return q.get('topico') or q.get('assunto') or 'Geral'

def ciclo(con, conta, questoes):
    ordem = sorted(questoes, key=lambda q:(materia(q) != 'Português', materia(q), assunto(q), q['id']))
    ids = [q['id'] for q in ordem]
    con.execute('INSERT OR IGNORE INTO ciclos(conta,ids) VALUES(?,?)',(conta,json.dumps(ids)))
    r=con.execute('SELECT * FROM ciclos WHERE conta=?',(conta,)).fetchone()
    previstos=json.loads(r['ids']); feitos=set(json.loads(r['feitos'])); mapa={q['id']:q for q in questoes}
    pendentes=[i for i in previstos if i not in feitos]
    grupos=defaultdict(lambda: {'total':0,'feitas':0})
    for i in previstos:
        nome=materia(mapa[i]) if i in mapa else 'Questão removida do catálogo'
        grupos[nome]['total']+=1; grupos[nome]['feitas']+=int(i in feitos)
    return {'concluidas':r['concluidos'],'feitas':len(feitos),'total':len(previstos),'proxima':pendentes[0] if pendentes and pendentes[0] in mapa else None,'bloqueada':bool(pendentes and pendentes[0] not in mapa),'materias':[dict(materia=m,**v) for m,v in grupos.items()], 'base':'Distribuição do catálogo de provas 2024 e 2025; classificações em revisão. Não é uma média histórica validada do Enem.'}

def avancar(con, conta, questao, questoes):
    estado=ciclo(con,conta,questoes)
    if estado['proxima'] != questao: return False
    r=con.execute('SELECT * FROM ciclos WHERE conta=?',(conta,)).fetchone()
    feitos=json.loads(r['feitos']); feitos.append(questao)
    terminou=len(feitos)==len(json.loads(r['ids'])) and bool(feitos)
    con.execute('UPDATE ciclos SET feitos=?,concluidos=concluidos+? WHERE conta=?',(json.dumps([] if terminou else feitos),int(terminou),conta))
    if terminou:
        ids=[q['id'] for q in sorted(questoes,key=lambda q:(materia(q)!='Português',materia(q),assunto(q),q['id']))]
        con.execute('UPDATE ciclos SET ids=? WHERE conta=?',(json.dumps(ids),conta))
    return terminou

def perfil(con,conta,questoes,agora=None):
    agora=agora or datetime.now(timezone.utc)
    inicio=(agora-timedelta(days=agora.weekday())).replace(hour=0,minute=0,second=0,microsecond=0)
    semana=inicio.isoformat(); mapa={q['id']:q for q in questoes}
    cache=con.execute('SELECT dados FROM medias WHERE semana=?',(semana,)).fetchone()
    if cache: medias=json.loads(cache[0])
    else:
        # Média de percentuais individuais, com todos os usuários reais com respostas.
        por_usuario=defaultdict(lambda:[0,0])
        for r in con.execute("SELECT r.conta,r.questao,r.acerto FROM respostas r JOIN contas c ON c.id=r.conta WHERE r.criada<? AND c.email!='teste'",(inicio.timestamp(),)):
            if r['questao'] not in mapa: continue
            q=mapa[r['questao']]
            for chave in [(materia(q),assunto(q)),('*','*')]:
                v=por_usuario[(r['conta'],*chave)];v[0]+=1;v[1]+=r['acerto']
        totais=defaultdict(list)
        for (_,m,a),(n,s) in por_usuario.items(): totais[m+'\n'+a].append(100*s/n)
        medias={k:{'usuarios':len(v),'percentual':round(sum(v)/len(v),1) if len(v)>=5 else None} for k,v in totais.items()}
        con.execute('INSERT OR IGNORE INTO medias VALUES(?,?)',(semana,json.dumps(medias)))
    grupos=defaultdict(lambda:[0,0])
    for r in con.execute('SELECT questao,acerto FROM respostas WHERE conta=?',(conta,)):
        if r['questao'] in mapa:
            q=mapa[r['questao']];v=grupos[(materia(q),assunto(q))];v[0]+=1;v[1]+=r['acerto']
    itens=[]
    for (m,a),(n,s) in grupos.items():
        media=medias.get(m+'\n'+a,{}).get('percentual')
        itens.append({'materia':m,'assunto':a,'tentativas':n,'acertos':s,'erros':n-s,'percentual':round(100*s/n,1),'media':media})
    return {'assuntos':sorted(itens,key=lambda x:(x['percentual'],x['materia'],x['assunto'])),'atualizada':semana,'periodo':'Histórico anterior à segunda-feira desta semana, em UTC. Média dos percentuais por usuário; mínimo de cinco usuários. Conta de teste excluída.','mediaGeral':medias.get('*\n*',{}).get('percentual')}
