"""Integração com Docker real, banco e volumes exclusivamente sintéticos."""
import base64,http.cookiejar,json,os,socket,subprocess,tempfile,time,urllib.request,urllib.error
from pathlib import Path
RAIZ=Path(__file__).resolve().parents[1]
PREFIXO='pu-laboratorio';ambiente={**os.environ,'PU_PREFIXO':PREFIXO,'PU_LIMITE_AMBIENTES':'2','PU_OCIOSO':'1'}
def docker(*args):return subprocess.check_output(['docker',*args],text=True).strip()
def obter(cliente,url,dados=None):
    req=urllib.request.Request(origem+url,data=json.dumps(dados).encode() if dados is not None else None,headers={'Origin':origem,'Content-Type':'application/json'})
    try:r=cliente.open(req,timeout=50)
    except urllib.error.HTTPError as e:r=e
    with r:
        corpo=r.read()
        return r.status,json.loads(corpo) if r.headers.get('Content-Type','').startswith('application/json') else corpo
with tempfile.TemporaryDirectory() as pasta:
    sock=pasta+'/controle.sock';ambiente['PU_SOCKET']=sock
    gerenciador=subprocess.Popen(['python3',str(RAIZ/'gerenciador/servidor.py')],env=ambiente,stdout=subprocess.DEVNULL)
    with socket.socket() as s:s.bind(('127.0.0.1',0));porta=s.getsockname()[1]
    origem=f'http://127.0.0.1:{porta}'
    servidor=subprocess.Popen(['python3',str(RAIZ/'app/servidor.py')],env={**os.environ,'DADOS':pasta+'/banco','ESCUTA':'127.0.0.1','PORTA':str(porta),'ORIGEM':origem,'PERFIL_TESTE':'0','AMBIENTES_INDIVIDUAIS':'1','PU_CONTROLE':sock},stdout=subprocess.DEVNULL)
    clientes=[urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())) for _ in range(3)]
    try:
        for _ in range(100):
            try:
                if Path(sock).exists() and obter(clientes[0],'/api/saude')[0]==200:break
            except OSError:pass
            time.sleep(.1)
        for i,c in enumerate(clientes):
            status,d=obter(c,'/api/cadastro',{'nome':f'Sintética {i}','email':f'lab{i}@example.invalid','senha':'Senha sintética longa 123!'})
            assert status==200,(status,d)
            assert d['iniciando']
        assert not docker('ps','-q','--filter','label=pu.gerenciador='+PREFIXO),'Login não deve bloquear aguardando inicialização.'
        a=obter(clientes[0],'/api/painel');b=obter(clientes[1],'/api/painel')
        assert a[0]==b[0]==200,(a,b)
        assert a[1]['conta']['id']!=b[1]['conta']['id']
        # Capacidade falha de forma controlada sem derrubar contas existentes.
        assert obter(clientes[2],'/api/painel')[0]==503
        if os.environ.get('PU_TESTAR_CHROME')=='1':subprocess.run(['node',str(RAIZ/'tests/ambientes-navegador.cjs'),origem],check=True)
        assert obter(clientes[0],'/site/')[0]==200
        assert obter(clientes[0],'/site/../../dados/painel.json')[0] in [400,404]
        assert obter(clientes[0],'/api/questoes/1',{'alternativa':0,'conta':2})[0]==400
        assert obter(clientes[0],'/api/questoes/1',{'alternativa':0})[0]==200
        assert obter(clientes[1],'/api/painel')[1]['progresso']['total']==0
        for i in ['1','2']:
            info=json.loads(docker('inspect',PREFIXO+'-'+i))[0]
            assert info['HostConfig']['NetworkMode']=='none'
            assert info['HostConfig']['ReadonlyRootfs']
            assert len(info['Mounts'])==1 and info['Mounts'][0]['Destination']=='/dados'
            assert info['Config']['User']=='10001:10001'
            painel=json.loads(docker('exec',PREFIXO+'-'+i,'cat','/dados/painel.json'))
            assert painel['conta']['id']==int(i)
            assert 'senha' not in painel and 'sessao' not in painel
        dispositivos=obter(clientes[0],'/api/dispositivos')[1]['dispositivos']
        alheio=obter(clientes[1],'/api/dispositivos')[1]['dispositivos'][0]['id']
        assert obter(clientes[0],'/api/dispositivos',{'acao':'revogar','id':alheio})[0]==404
        assert obter(clientes[0],'/api/dispositivos',{'acao':'revogar','id':dispositivos[0]['id']})[0]==200
        assert obter(clientes[0],'/api/painel')[0]==401
        # Parada por inatividade preserva volume e retomada preserva progresso.
        time.sleep(17)
        assert docker('inspect',PREFIXO+'-2','--format','{{.State.Running}}')=='false'
        assert obter(clientes[1],'/api/painel')[0]==200
        assert docker('inspect',PREFIXO+'-2','--format','{{.State.Running}}')=='true'
        print('OK: início autenticado, dois volumes, isolamento sem rede, capacidade, recusa de arquivos, revogação e retomada após inatividade.')
    finally:
        servidor.terminate();servidor.wait();gerenciador.terminate();gerenciador.wait()
        for nome in docker('ps','-aq','--filter','label=pu.gerenciador='+PREFIXO).splitlines():docker('rm','-f',nome)
        for numero in ['1','2','3']:
            subprocess.run(['docker','volume','rm',PREFIXO+'-'+numero],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
