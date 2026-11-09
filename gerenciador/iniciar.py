"""Inicia somente o controlador restrito do PU, sem expor o daemon Docker."""
import os, socket, subprocess, sys, time
from pathlib import Path
RAIZ=Path(__file__).resolve().parents[1]
pasta=RAIZ/'.segredos/gerenciador';pasta.mkdir(parents=True,exist_ok=True,mode=0o711);pasta.chmod(0o711)
endereco=str(pasta/'controle.sock')
def vivo():
    with socket.socket(socket.AF_UNIX) as s:return s.connect_ex(endereco)==0
if vivo():
    subprocess.run(['systemctl','--user','restart','pu-gerenciador.service'],check=True)
else:
    comando=['systemd-run','--user','--unit=pu-gerenciador','--collect','--property=Restart=on-failure','--setenv=PU_SOCKET='+endereco]
    if os.environ.get('DOCKER_HOST'):comando.append('--setenv=DOCKER_HOST='+os.environ['DOCKER_HOST'])
    if os.environ.get('DOCKER_CONTEXT'):comando.append('--setenv=DOCKER_CONTEXT='+os.environ['DOCKER_CONTEXT'])
    subprocess.run([*comando,sys.executable,str(RAIZ/'gerenciador/servidor.py')],check=True)
for _ in range(100):
    if vivo():break
    time.sleep(.1)
else:raise SystemExit('Não foi possível iniciar o gerenciador local do PU.')
print('Gerenciador individual do PU disponível.')
