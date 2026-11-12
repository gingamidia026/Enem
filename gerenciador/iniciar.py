"""Inicia somente o controlador restrito do PU, sem expor o daemon Docker.

Dominique-Oliveira-ChatGPT🤖💚. Em 12/11/2026, Dominique-Oliveira-Claude🤖🧡 trocou a unidade transitória por uma
unidade permanente do usuário: a transitória sumia quando o computador reiniciava e todo painel passava a
responder "ambiente indisponível" até alguém rodar `pu reiniciar`.
"""
import os, socket, subprocess, sys, time
from pathlib import Path
RAIZ=Path(__file__).resolve().parents[1]
pasta=RAIZ/'.segredos/gerenciador';pasta.mkdir(parents=True,exist_ok=True,mode=0o711);pasta.chmod(0o711)
endereco=str(pasta/'controle.sock')
MARCA='# PU: unidade criada por gerenciador/iniciar.py'
def vivo():
    with socket.socket(socket.AF_UNIX) as s:return s.connect_ex(endereco)==0
docker_host=os.environ.get('DOCKER_HOST') or ('unix:///run/user/%d/docker.sock'%os.getuid() if Path('/run/user/%d/docker.sock'%os.getuid()).is_socket() else '')
ambiente=['Environment="PU_SOCKET=%s"'%endereco]
if docker_host:ambiente.append('Environment="DOCKER_HOST=%s"'%docker_host)
if os.environ.get('DOCKER_CONTEXT'):ambiente.append('Environment="DOCKER_CONTEXT=%s"'%os.environ['DOCKER_CONTEXT'])
unidade=Path.home()/'.config/systemd/user/pu-gerenciador.service'
conteudo=f'''{MARCA}
[Unit]
Description=PU: gerenciador dos ambientes individuais
After=docker.service
Wants=docker.service
[Service]
{chr(10).join(ambiente)}
ExecStart={sys.executable} {RAIZ/'gerenciador/servidor.py'}
Restart=always
RestartSec=3
[Install]
WantedBy=default.target
'''
# Só substitui a unidade criada por este instalador.
if unidade.exists() and MARCA not in unidade.read_text():
    raise SystemExit('Unidade já existe e não pertence a este instalador: '+str(unidade))
unidade.parent.mkdir(parents=True,exist_ok=True)
if not unidade.exists() or unidade.read_text()!=conteudo:
    # Uma unidade transitória antiga com o mesmo nome é encerrada antes de a permanente assumir.
    subprocess.run(['systemctl','--user','stop','pu-gerenciador.service'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    unidade.write_text(conteudo)
    subprocess.run(['systemctl','--user','daemon-reload'],check=True)
subprocess.run(['systemctl','--user','enable','pu-gerenciador.service'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
subprocess.run(['systemctl','--user','restart','pu-gerenciador.service'],check=True)
for _ in range(100):
    if vivo():break
    time.sleep(.1)
else:raise SystemExit('Não foi possível iniciar o gerenciador local do PU.')
print('Gerenciador individual do PU disponível e ligado ao início da sessão.')
