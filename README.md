# ENEM • Espaço de estudo

Aplicação de estudo com Docker, contas e histórico no PC da Dominique. Autora: Dominique-Oliveira-ChatGPT🤖💚.

## Estado atual

- Funcionam na instalação local: perfil Teste (`teste` / `123`), cadastro individual, treino por área, explicação, simulado curto e progresso persistente.
- A interface pública é publicada no GitHub Pages, com o mesmo visual da aplicação. Não contém links para localhost.
- A conexão pública está **preparada, mas desativada**. A ferramenta Sites recusou mudar o intermediário de privado para público porque exige aprovação e a política da sessão não permite aprovações. Não há conexão pública funcional com o PC neste estado.
- O login público mostra uma mensagem de configuração e não autentica pessoas enquanto essa dependência existir. Não há simulação de login nem armazenamento alternativo no navegador.

Quatro questões autorais demonstrativas, sem vínculo com o Inep e sem cálculo TRI. Ainda não há banco oficial completo, professores, redação, recuperação de senha ou verificação de e-mail. O perfil Teste é compartilhado; contas individuais têm seus históricos separados.

## Visual

Aplicação das orientações de [Emil Kowalski](https://github.com/emilkowalski/skills): fundo claro, tons neutros, hierarquia contida, sombras discretas, pressão de botão de 140 ms, foco visível e preferência de movimento reduzido. Essa referência traz princípios de interface, não uma identidade de marca para copiar. Sem logos ou personagens de terceiros.

## Ligar e parar

```sh
./scripts/instalar-comando.sh
enem
enem parar
enem reiniciar
enem status
enem logs
```

O instalador cria o atalho em `~/.local/bin` sem substituir outro comando. A sessão de desenvolvimento não pôde escrever nessa pasta; execute o instalador no terminal da Dominique. Antes disso, use `./enem` dentro deste projeto. A instalação local abre em `http://localhost:8088`, apenas para administração e testes neste PC. Parar e reiniciar preservam o volume.

## Acesso público sem portas abertas no PC

Fluxo implementado em código, ainda não ativado:

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

## Ativação pendente

O projeto do intermediário está registrado em `conexao-publica/.openai/hosting.json`. Seu código, migração e artefato foram preparados. A publicação pública foi bloqueada pela ferramenta; nenhum túnel ou porta alternativa foi aberto.

Após uma sessão com capacidade de aprovar a mudança de público:

1. Revisar e publicar o intermediário como público, com o binding D1 `DB` e a chave secreta `CHAVE_CONECTOR`.
2. Provisionar a mesma chave no arquivo `.segredos/conector` deste PC, fora do Git. Manter o diretório em 0700 e o arquivo em leitura para o usuário do contêiner. Não copiar uma chave pública de exemplo.
3. Ajustar a origem HTTPS verificada em `compose.publico.yaml` e em `configuracao-publica.js`; habilitar a configuração somente após teste externo.
4. Criar `.segredos/ativado` e iniciar `enem`. A presença da chave sozinha não inicia a conexão pública.
5. Conferir de outro aparelho o fluxo inteiro, o isolamento das contas, expiração e desligamento do PC antes de declarar o acesso público concluído.

O `.env`, as chaves, o banco e o estado da sessão nunca devem ir para GitHub. O repositório contém código e conteúdo demonstrativo, não os dados operacionais.

## Conferência

```sh
python3 tests/testar.py
node tests/intermediario.mjs
docker compose -f compose.yaml -f compose.publico.yaml config --quiet
bash conexao-publica/scripts/build.sh
node conexao-publica/scripts/validate-artifact.mjs
```

O teste do intermediário usa SQLite em memória, sem acessar dados ou serviços reais. O teste de navegador opcional está em `tests/navegador.cjs`. Detalhes e limites em `docs/VERIFICACAO.md`.
