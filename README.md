# Vestibular para Todos (VPT) • Espaço de estudo

Aplicação de estudo com Docker, contas e histórico no PC da Dominique. Autora: Dominique-Oliveira-ChatGPT🤖💚.

## Estado atual

- Funcionam na instalação local: perfil Teste (`teste` / `123`), cadastro individual, treino por área, explicação, simulado curto e progresso persistente.
- A interface pública é publicada no GitHub Pages, com o mesmo visual da aplicação. Não contém links para localhost.
- Conexão pública ativada em 09/11/2026. Login e painel autenticado verificados por HTTPS. O PC e o conector precisam permanecer ligados.
- Cadastro e login usam o banco local por intermédio da fila pública.

Quatro questões autorais demonstrativas, sem vínculo com o Inep e sem cálculo TRI. Ainda não há banco oficial completo, professores, redação, recuperação de senha ou verificação de e-mail. O perfil Teste é compartilhado; contas individuais têm seus históricos separados.

## Visual

Aplicação da skill [apple-design, da coleção de Emil Kowalski](https://github.com/emilkowalski/skills/tree/main/skills/apple-design): fonte do sistema com dimensões em rem, camadas translúcidas, superfícies agrupadas, foco visível e retorno imediato ao toque. O formulário mostra carregamento e erros junto aos campos; a correção identifica textualmente a resposta escolhida e a correta. Há suporte independente a movimento reduzido, transparência reduzida e contraste reforçado. Essa referência traz princípios de interface, não uma identidade de marca para copiar. Sem logos ou personagens de terceiros.

## Ligar e parar

```sh
./scripts/instalar-comando.sh
vpt
vpt parar
vpt reiniciar
vpt status
vpt logs
vpt ajuda
```

O instalador cria o comando `vpt` em `~/.local/bin`, sem substituir outro comando. `vpt` inicia a aplicação, o proxy e o conector público configurado. A instalação local abre em `http://localhost:8088`. Parar e reiniciar preservam o volume com contas e histórico. `vpt logs` acompanha os registros; Ctrl+C sai da visualização e mantém o site ligado. Autora da atualização: Dominique-Oliveira-ChatGPT🤖💚.

## Acesso público sem portas abertas no PC

Fluxo ativo:

1. Navegador acessa somente o GitHub Pages e o intermediário HTTPS público.
2. O intermediário valida a origem e permite somente operações de cadastro, login, questões, respostas e progresso. Ele coloca o pedido em uma fila temporária.
3. O contêiner `conector` do PC inicia uma conexão HTTPS de saída e retira os pedidos. Não escuta portas e não recebe URLs ou comandos arbitrários.
4. O conector consulta apenas as rotas permitidas da aplicação, na rede Docker interna, e envia o resultado ao intermediário.
5. O navegador recebe apenas sua resposta, mediante recibo imprevisível de uso único. A sessão de estudo fica na memória da página; atualizar a página exige novo login.

O visitante não recebe endereço IP do PC, link local, banco, cofre, terminal, socket Docker ou área de trabalho. O conector não monta o banco; monta somente sua chave individual em leitura. A aplicação monta apenas o próprio volume `estudos`. Docker reduz privilégios, mas não garante isolamento absoluto do kernel ou proteção contra toda vulnerabilidade.

### Dados em trânsito e limites

Contas, hashes de senha e histórico persistente ficam no SQLite local. Para transportar operações, o intermediário precisa receber temporariamente os campos enviados pelo navegador, incluindo credenciais de login, e as respostas da aplicação. HTTPS protege o transporte; a fila não tem criptografia adicional em repouso. Não afirmar que nenhum dado passa ou existe fora do PC.

Pedidos são válidos por 35 segundos. O payload do pedido é limpo após a retirada pelo conector; o resultado é excluído quando o navegador o consome. Registros expirados são limpos no próximo processamento, não por um relógio de exclusão garantida. Limites do intermediário: 60 pedidos/minuto por hash do IP e 100 registros na fila. Nenhum IP bruto é gravado pela aplicação, mas o provedor pode manter seus próprios registros de infraestrutura. O banco local não está criptografado em disco.

A ausência do conector deve aparecer como indisponibilidade temporária. Um PC desligado não pode atender visitantes; manter o volume local não oferece disponibilidade quando ele está offline. Antes de uso com dados reais, revisar retenção, privacidade, menores, proteção contra abuso, backup e carga.

## Conexão ativa

Intermediário publicado como público com D1 e segredo do conector. A chave local permanece fora do Git. O comando `./vpt` inicia o conector quando `.segredos/ativado` está presente.

Verificados por HTTPS: disponibilidade, login, painel e saída. Os testes locais verificam cadastro, isolamento de contas e limitação de tentativas. Acesso exige PC e Docker ligados. Autora da ativação: Dominique-Oliveira-ChatGPT🤖💚.

## Conferência

```sh
python3 tests/testar.py
node tests/intermediario.mjs
docker compose -f compose.yaml -f compose.publico.yaml config --quiet
bash conexao-publica/scripts/build.sh
node conexao-publica/scripts/validate-artifact.mjs
```

O teste do intermediário usa SQLite em memória, sem acessar dados ou serviços reais. O teste de navegador opcional está em `tests/navegador.cjs`. Detalhes e limites em `docs/VERIFICACAO.md`.

## Funcionamento do Vestibular para Todos (VPT) no computador

Digite `vpt` em qualquer pasta do terminal. Sem argumento, ele equivale a `vpt iniciar`: seleciona o Docker configurado (ou o socket rootless disponível), tenta iniciar o serviço Docker do usuário se necessário, constrói a imagem local e sobe os serviços em segundo plano, aguardando a saúde da aplicação.

- `vpt parar`: interrompe os serviços deste projeto, preservando contas e histórico.
- `vpt reiniciar`: reinicia os serviços e aguarda a aplicação ficar disponível.
- `vpt status`: lista os serviços, inclusive os parados.
- `vpt logs`: acompanha os registros, começando pelas últimas 50 linhas. Ctrl+C encerra apenas a visualização.
- `vpt ajuda`: mostra os comandos. `ligar` e `iniciar` são equivalentes; `desligar` equivale a `parar`.

A aplicação lê e grava o banco no volume Docker `enem_estudos`, montado em `/dados`. O proxy oferece o acesso local em `http://localhost:8088`. O conector público também sobe quando existem `.segredos/conector` e `.segredos/ativado`; ele consulta a fila HTTPS por conexões de saída. A interface pública depende do computador, do Docker, da aplicação e do conector ligados. Parar os serviços deixa o atendimento público indisponível até iniciar novamente.

O nome apresentado é sempre **Vestibular para Todos (VPT)**. ENEM continua mencionado quando é o exame estudado. A pasta `Enem`, o nome técnico Compose `enem`, o volume, as variáveis de integração e os endereços publicados foram preservados para manter os dados e a conexão existente. Não use `docker compose down -v`: esse comando exclui os volumes de dados. Parar não equivale a fazer uma cópia de segurança.

Para reinstalar o atalho, execute `./scripts/instalar-comando.sh` nesta pasta. O controlador principal é `./vpt`; `./enem` permanece apenas como compatibilidade com atalhos anteriores. O instalador recusa substituir comandos de outro projeto.

## Atualizações

- 09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚 · Nome alterado para Vestibular para Todos (VPT) na interface local e estática, no título e na identificação acessível. Documentados os comandos, os serviços, a persistência e as condições de acesso público.
