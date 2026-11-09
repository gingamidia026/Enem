import subprocess
r=subprocess.run(['docker','ps','-q','--filter','label=pu.gerenciador=pu-pessoa'],capture_output=True,text=True,check=True)
for identificador in r.stdout.splitlines():subprocess.run(['docker','stop','--time','3',identificador],check=True,stdout=subprocess.DEVNULL)
print('Ambientes individuais parados. Volumes preservados.')
