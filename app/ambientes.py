"""Cliente restrito do gerenciador local. Só IDs vindos de sessão autenticada."""
import base64, json, os, socket
class AmbienteIndisponivel(RuntimeError):pass
ATIVO=os.environ.get('AMBIENTES_INDIVIDUAIS','0')=='1'
def solicitar(conta,acao='iniciar',**dados):
    if not ATIVO:return {'estado':'compartilhado'}
    with socket.socket(socket.AF_UNIX) as conexao:
        conexao.settimeout(35)
        conexao.connect(os.environ.get('PU_CONTROLE','/controle/controle.sock'))
        conexao.sendall(json.dumps({'acao':acao,'conta':conta,**dados}).encode()+b'\n')
        with conexao.makefile('rb') as leitor:resposta=json.loads(leitor.readline(6000000))
    if 'erro' in resposta:raise AmbienteIndisponivel(resposta['erro'])
    return resposta
def painel_individual(conta,painel):
    if not ATIVO:return painel
    return json.loads(base64.b64decode(solicitar(conta,'painel',painel=painel)['corpo']))
