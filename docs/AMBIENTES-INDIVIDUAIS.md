# Ambientes individuais do PU
Autora: Dominique-Oliveira-ChatGPT🤖💚.

Objetivo: central mantém autenticação, dispositivos, gabaritos e histórico autoritativo. Um contêiner por conta, iniciado somente após autenticação, recebe apenas o painel filtrado daquela pessoa e tem volume próprio. O volume guarda sua última cópia do painel, sem senhas, sessões ou gabaritos. O catálogo sem respostas é comum.

O gerenciador roda no host, fora da aplicação exposta, com protocolo restrito em socket Unix. O socket Docker nunca é montado na central ou no site individual. O gerenciador aceita só IDs numéricos de contas, usa imagem fixa e contêineres sem rede, limita recursos e para ambientes ociosos. Central identifica a conta pela sessão; navegador nunca escolhe ID, contêiner, imagem, comando ou volume.

Dispositivo: token aleatório registrado no primeiro login bem-sucedido; reconhecimento automático após login/sessão válida. Uma pessoa autenticada pode listar e revogar dispositivos. Sessão em cookie HttpOnly no modo direto; identificação do navegador no armazenamento local, sem poder de autenticação por si só. Transporte público legado exige sessão no navegador. Não usar impressão digital/IP como identidade. Conta sem dispositivo reconhecido precisa autenticar por senha para registrar outro, até cinco dispositivos. Revogar dispositivo revoga suas sessões.

Inatividade: 15 minutos, contados pelo servidor; fechar uma aba não encerra as demais. Sair encerra sua sessão, sem apagar dados. Todos os ambientes param no comando pu parar. Limite inicial: dez ambientes simultâneos, com erro recuperável ao atingir capacidade. Não é capacidade medida de produção.

Conexão pública permanece fila existente, com suas limitações de latência e credenciais transitórias externas. Docker por conta não elimina essa fila. Interface pública compartilhada é a entrada; painel é servido pelo ambiente pessoal através da central. Acesso local pode servir recursos do site pelo ambiente autenticado. Não prometer nova conexão direta.

## Estado entregue e operação

`pu iniciar`/`pu reiniciar` constroem a imagem `pu-individual:local`, iniciam o gerenciador como unidade systemd da usuária e sobem a central. `pu parar` interrompe os ambientes sem apagar volumes. A rede do site individual é `none`; o controlador usa execução de um cliente HTTP fixo dentro dele, com JSON pela entrada padrão. Nenhum dado vira comando, imagem ou caminho Docker. Só a central monta o socket restrito do controlador; nenhum contêiner recebe o socket Docker.

Cada volume individual contém uma cópia do painel, sem senha, sessão ou gabaritos; a versão autoritativa do progresso continua no banco central. Os gabaritos continuam no catálogo local somente em leitura; não foram movidos para o banco nem publicados. O site comum do GitHub é a entrada pública; cada painel passa pelo contêiner individual. A rota local `/site/` serve o site pelo contêiner autenticado. Não existe serviço de envio de documentos pessoais nesta versão: não foram inventados arquivos nem permissões para material inexistente.

Uma revogação encerra as sessões daquele identificador de navegador. Não comprova identidade física do aparelho; quem conhece a senha pode registrar outro navegador dentro do limite. Não é segundo fator. Antes da mudança, sessões antigas sem dispositivo deixam de ser aceitas no modo individual e pedem novo login. Histórico preservado.

Primeira inicialização de cada conta pode demorar; a fila pública ainda usa processamento sequencial e limites compartilhados por origem do conector. Não afirmar maior velocidade ou capacidade de grande escala. Prazo de inatividade configurável no gerenciador pelo ambiente `PU_OCIOSO`; limite por `PU_LIMITE_AMBIENTES`.

## Verificações

Dez testes HTTP existentes aprovados. Integração com Docker real e banco sintético aprovou: dois volumes separados; rede `none`, usuário 10001 e raiz somente leitura; painel próprio; recusa de caminho interno e conta adulterada; capacidade com erro recuperável; revogação entre contas negada; sessão revogada recusada; parada e retomada com volume preservado. Chrome aprovou mensagem de espera, rota `/site/`, tela de dispositivos e larguras 390, 768 e 1440. Nenhum teste usa contas reais.

Comandos: `python3 tests/testar.py`; `DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock python3 tests/ambientes.py`. Opcional: `PU_TESTAR_CHROME=1 PLAYWRIGHT_MODULO=/caminho/playwright-core` no segundo comando, com Chrome instalado. A imagem individual deve ser construída antes do teste Docker.
