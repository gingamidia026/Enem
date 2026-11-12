# Pé na Universidade (PU) • Espaço de estudo

Aplicação de estudo com Docker, contas e histórico no PC da Dominique. Autora: Dominique-Oliveira-ChatGPT🤖💚.

## Fluxo de estudo desde 12/11/2026

A interface foi refeita para começar sem atrito: ao entrar ou voltar, a questão já está aberta; a meta do dia é pequena e tem ponto de parada; o que a pessoa erra ou chuta volta depois de 1, 3 e 7 dias; as matérias se alternam e há foco opcional por matéria ou assunto; o simulado curto corrige só no fim. Desenho, pesquisa, limites e testes em [Plataforma fluida](docs/PLATAFORMA-FLUIDA.md). As seções abaixo descrevem a infraestrutura, que não mudou. Autora desta atualização: Dominique-Oliveira-Claude🤖🧡.

## Estado atual

- Funcionam na instalação local: perfil Teste (`teste` / `123`), cadastro individual, treino por área, explicação, simulado curto e progresso persistente.
- A interface pública é publicada no GitHub Pages em https://pu.gingamidia.com/, com o mesmo visual da aplicação. Não contém links para localhost.
- Conexão pública ativada em 09/11/2026. Login e painel autenticado verificados por HTTPS. O PC e o conector precisam permanecer ligados.
- Cadastro e login usam o banco local por intermédio da fila pública.

O catálogo de questões é exportado do cofre Vestibular ao executar `pu` ou `pu reiniciar`, sem IA. Questões anuladas não entram no treino; o histórico das contas é preservado. A simulação de notas calcula médias, sem converter acertos em TRI. Professores, correção de redação, recuperação de senha e verificação de e-mail ainda não estão implementados. O perfil Teste é compartilhado; contas individuais têm seus históricos separados.

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
5. O navegador recebe apenas sua resposta, mediante recibo imprevisível de uso único. A sessão de estudo pública fica salva no navegador por até 30 dias, sem guardar a senha. Ao atualizar ou abrir outra aba, o servidor valida o acesso salvo. Sair da conta ou receber sessão inválida remove o token. O armazenamento público é acessível ao JavaScript da mesma origem; a aplicação local usa cookie HttpOnly.

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

## Funcionamento do Pé na Universidade (PU) no computador

Digite `vpt` em qualquer pasta do terminal. Sem argumento, ele equivale a `vpt iniciar`: seleciona o Docker configurado (ou o socket rootless disponível), tenta iniciar o serviço Docker do usuário se necessário, constrói a imagem local e sobe os serviços em segundo plano, aguardando a saúde da aplicação.

- `vpt parar`: interrompe os serviços deste projeto, preservando contas e histórico.
- `vpt reiniciar`: reinicia os serviços e aguarda a aplicação ficar disponível.
- `vpt status`: lista os serviços, inclusive os parados.
- `vpt logs`: acompanha os registros, começando pelas últimas 50 linhas. Ctrl+C encerra apenas a visualização.
- `vpt ajuda`: mostra os comandos. `ligar` e `iniciar` são equivalentes; `desligar` equivale a `parar`.

A aplicação lê e grava o banco no volume Docker `enem_estudos`, montado em `/dados`. O proxy oferece o acesso local em `http://localhost:8088`. O conector público também sobe quando existem `.segredos/conector` e `.segredos/ativado`; ele consulta a fila HTTPS por conexões de saída. A interface pública depende do computador, do Docker, da aplicação e do conector ligados. Parar os serviços deixa o atendimento público indisponível até iniciar novamente.

O nome apresentado é sempre **Pé na Universidade (PU)**. ENEM continua mencionado quando é o exame estudado. A pasta `Enem`, o nome técnico Compose `enem`, o volume, as variáveis de integração e os endereços publicados foram preservados para manter os dados e a conexão existente. Não use `docker compose down -v`: esse comando exclui os volumes de dados. Parar não equivale a fazer uma cópia de segurança.

Para reinstalar o atalho, execute `./scripts/instalar-comando.sh` nesta pasta. O controlador principal é `./vpt`; `./enem` permanece apenas como compatibilidade com atalhos anteriores. O instalador recusa substituir comandos de outro projeto.

## Atualizações

- 09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚 · Nome alterado para Pé na Universidade (PU) na interface local e estática, no título e na identificação acessível. Documentados os comandos, os serviços, a persistência e as condições de acesso público.

## Reforço de segurança de 09/11/2026

Preparação de produção, cópia criptografada, restauração testada e rotinas locais descritas em [Segurança e recuperação](docs/SEGURANCA-E-RECUPERACAO.md). A migração para servidor separado e a retirada da fila do acesso público ainda dependem de hospedagem e domínio.

- 09/11/2026 13:06 · Dominique-Oliveira-ChatGPT🤖💚 · Nome público alterado para Pé na Universidade (PU), por escolha expressa de Dominique. Interfaces, metadados e mensagens locais atualizados; endereços e identificadores técnicos preservados.

## Simular nota Enem

A seção “Simular nota Enem” calcula média simples e compara até três opções manuais de instituição, curso e modalidade, com pesos próprios, referência de corte e edição. Mostra a diferença para a meta e a nota necessária em cada área mantendo as outras quatro fixas. Aceita vírgula decimal, notas zero e pesos zero com soma positiva. Os pesos iniciais iguais a 1 representam média simples, não pesos oficiais de algum curso. A redação respeita o limite de 1.000; as áreas objetivas não recebem esse teto artificial.

Os dados são informados pela estudante; não existe catálogo automático de cortes nem previsão de TRI a partir de acertos. Rascunho somente em memória na aba, apagado ao recarregar ou sair, sem gravação no banco ou serviços externos. O cálculo não incorpora bonificações ou regras de elegibilidade. Fórmula e fonte Inep acessíveis na própria seção. Origem do pedido: documentação e planilha vinculada no cofre Vestibular, aba Etapa 1. A Etapa 2 da planilha usa proporção de estudo e recorrência; essa proporção não foi apresentada como previsão garantida de nota.

Verificações: `node tests/simulador.cjs` e `PLAYWRIGHT_MODULO=/caminho/playwright-core node tests/simulador-navegador.cjs`. O teste de navegador usa banco temporário e não depende do banco real. O módulo está tanto na entrada local quanto na entrada preparada para Pages. Publicação não realizada nesta etapa.

## Atualização automática das questões

Ao iniciar ou reiniciar pelo comando `pu`, as inclusões, exclusões e alterações em `Provas Enem/Questões` são sincronizadas por Python local, sem consumir tokens. O reinício preserva as contas e respostas. Recarregue a página para consultar a lista nova. Consulte [Sincronização](docs/SINCRONIZACAO.md) para formato, proteção contra erros e limites.
