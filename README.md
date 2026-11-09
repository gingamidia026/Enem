# ENEM • Espaço de estudo

Plataforma independente de estudo, com Docker e dados mantidos no servidor. Criada a pedido de Dominique Oliveira.

## O que funciona nesta primeira versão

- Cadastro e login com senha de 12 a 128 caracteres.
- Treino por área do conhecimento e explicação após responder.
- Simulado curto com quatro questões autorais demonstrativas.
- Histórico individual de tentativas e acertos persistido em SQLite.
- Interface responsiva com navegação por teclado.

As questões iniciais são demonstrações, não provas oficiais do Inep. O percentual de acerto não é nota TRI. Ainda não há banco completo, professores, recuperação de senha, verificação de e-mail, redação ou correção por IA. O simulado em andamento fica na memória da página; as respostas já enviadas ficam salvas no servidor.

## Como protege a separação do computador

O navegador recebe interface, dados da conta autenticada, catálogo resumido e uma questão por vez. Gabarito e explicação são enviados somente depois da resposta. Tudo que chega ao navegador pode ser visto por quem o usa; não existe proteção absoluta contra cópia do conteúdo exibido.

A aplicação não monta o cofre, a pasta pessoal, a ponte da Ginga ou o socket Docker. Não há terminal nem execução de comandos pela API. O único volume de dados da aplicação é `estudos`, exclusivo deste projeto. Ela roda como usuário sem privilégios, com sistema de arquivos somente para leitura, capacidades removidas e rede Docker interna sem saída direta para a internet.

Docker reduz o acesso ao host, mas compartilha seu kernel e não garante isolamento absoluto. **Para que estudantes não se conectem ao computador pessoal, hospede em um servidor separado.** Não configure encaminhamento de portas, túnel ou acesso remoto para esse computador. Não reutilize credenciais, volumes ou a rede da plataforma dos funcionários.

## Experimentar localmente

Requer Docker Engine e Docker Compose.

```sh
docker compose up -d --build
```

Abra `http://localhost:8088`. A porta de teste é ligada apenas em `127.0.0.1`. Cadastre contas de teste pela interface. Não existe senha padrão. A plataforma dos funcionários não é alterada.

```sh
# Parar sem apagar os dados
docker compose stop
# Verificar saúde
docker compose ps
# Testes HTTP com banco descartável, sem dependências externas
python3 tests/testar.py
```

## Hospedar em servidor separado com HTTPS

1. Provisione um servidor Linux próprio para o ENEM, com Docker e Compose; use acesso administrativo por chave e mantenha o sistema atualizado.
2. Aponte o DNS do domínio escolhido para esse servidor. Libere as portas 80 e 443; não exponha Docker, banco ou porta 8000.
3. Clone o repositório no servidor e execute, substituindo o domínio de exemplo:

```sh
DOMINIO=estudo.seu-dominio.com docker compose -f compose.producao.yaml up -d --build
```

O Caddy solicita certificado HTTPS. A origem é fixada no domínio e os cookies passam a exigir HTTPS. A aplicação só é acessível pelo proxy; o banco não tem porta de rede. Não execute a configuração de produção no computador pessoal.

Publicar este repositório no GitHub publica o código; não hospeda a API ou o banco. GitHub Pages não executa este servidor.

## Dados e operação

Senhas são armazenadas com scrypt e sal individual. Sessões têm validade de 24 horas, token aleatório armazenado como resumo e cookie HttpOnly/SameSite. POST exige origem autorizada e JSON, com limite de tamanho. Não há CORS aberto. A autorização é verificada no servidor e o histórico é filtrado pela conta da sessão, não por um identificador enviado pelo navegador.

Há limites persistentes por e-mail e limite global de autenticação. O global também pode bloquear usuários legítimos durante abuso; para público real, adicione proteção por IP no proxy/WAF, sem confiar cegamente em cabeçalhos fornecidos pelo cliente. O servidor limita conexões simultâneas e tempo de leitura; esta é uma base para operação pequena, sem teste de carga de produção.

O banco não está criptografado em disco. Administradores do servidor e do Docker podem lê-lo. Use armazenamento e backups criptografados no provedor; restrinja o acesso administrativo. Não grave dados reais, `.env`, certificados ou backups no GitHub.

Antes de abrir cadastros reais: revisar privacidade e retenção, tratamento de contas de menores, processo de exclusão/recuperação, verificação de e-mail, conteúdo pedagógico e capacidade do servidor. Não são recursos já implementados nesta versão.

Para backup consistente, pare a aplicação e copie o banco do volume para armazenamento protegido usando as ferramentas do provedor. Teste a restauração em uma instalação separada antes de depender desse backup. Nunca use `docker compose down -v` para uma parada comum: essa opção remove os volumes e seus dados.

Detalhes da direção e escopo em [docs/PLANO.md](docs/PLANO.md). Autoria: Dominique-Oliveira-ChatGPT🤖💚.
