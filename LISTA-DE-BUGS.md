# Lista de correções do Vestibular para Todos (VPT)

Autora: Dominique-Oliveira-ChatGPT🤖💚.

1. 09/11/2026: endereço GitHub Pages sem a entrada da plataforma. Causa: repositório Docker sem index.html na raiz; os arquivos da aplicação usavam rotas locais. Correção: entrada estática na raiz, caminhos relativos e botão que abre o login da aplicação local. Testes: arquivo e recurso CSS presentes, botão destinado à aplicação local; navegação Pages → aplicação local → autenticação no Chrome. Acesso de outros aparelhos continua dependente da conexão com o PC e não deve ser declarado disponível.

2. 09/11/2026: visitante público recebia link para localhost, que apontava para o próprio aparelho. Removido. A raiz passa a renderizar a interface real e o login, com aviso de indisponibilidade até ativar o intermediário de saída. Não fingir que localhost alcança o computador da Dominique. Conexão pública bloqueada por exigência de aprovação da ferramenta Sites; pendência explícita, sem contorno por túnel.

3. 09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚: login público desativado. Intermediário publicado com acesso público e segredo, conector ativado. Corrigido User-Agent do conector: o padrão Python recebia HTTP 403 do provedor. Login e painel reais verificados por HTTPS.

4. 09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚: contador global de autenticação podia recusar entradas de todos. Versão de produção passa a limitar origem e conta/origem; duas contas, expiração, revogação e atualização de hashes antigos testadas. Nova arquitetura direta HTTPS com cookie __Host-sessao preparada. Migração pública pendente de servidor/domínio; fila antiga não está declarada corrigida. Cópia criptografada real e restauração isolada verificadas; rotina local ativada. Detalhes em docs/SEGURANCA-E-RECUPERACAO.md.

5. 09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚: domínio pu.gingamidia.com recebia “Failed to fetch”, pois CORS autorizava só GitHub Pages. Incluída a origem HTTPS exata, mantendo rejeição de origens arbitrárias. Teste: tests/intermediario.mjs cobre domínio atual, legado e origens recusadas; confirmação final no navegador público.

6. 09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚: sessão pública sumia ao atualizar. Token com validade local de até 24 horas, restaurado mediante validação pelo servidor; senha não armazenada; saída e 401 removem o token. Falha de rede preserva o acesso salvo para nova tentativa. Teste: tests/sessao-publica.cjs cobre recarga, nova aba, saída, revogação, expiração e rede indisponível.

7. 09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚: login deslocado porque menu oculto reservava largura e main tinha limite sem centralização. Reforçado hidden e centralizado formulário na área disponível; retirada indicação de credenciais da conta demonstrativa. Testes: navegador em 320, 390, 768 e 1440 px, com medida de centro e largura; conta teste continua disponível.

8. 2026-11-09T13:56:09-03:00 · Dominique-Oliveira-ChatGPT🤖💚: topo muito alto, sessão percebida como perdida e espera ao entrar/abrir questão. Cabeçalho de 52 px; menu móvel com toque de 44 px. Nova sessão de 30 dias; retomada sem exibir formulário enquanto valida. Login devolve painel em uma viagem; catálogo demonstrativo inclui enunciados sem gabarito e abre questão sem rede. API temporária: login 325 ms, abertura 70 ms; estes números não medem rede pública. Testes: 9 testes Python aprovados; Chrome real isolado em quatro larguras; sessão pública simulada, uma solicitação de login e zero ao abrir questão; intermediário aprovado. Publicação pendente de autorização.

- 2026-11-09T13:59:26-03:00 · Dominique-Oliveira-ChatGPT🤖💚 · Publicação autorizada por Dominique: commit 50c0f61 enviado ao repositório PU. GitHub Actions Verificar plataforma (42660013086) e Pages (42660012693) concluídos com sucesso. Servidor Docker reconstruído; três serviços saudáveis; banco com integridade OK e cópia criptografada verificada antes da aplicação. Chrome no domínio https://pu.gingamidia.com/ sem interceptação: login 3848 ms em uma solicitação, questão 69 ms sem solicitação adicional, sessão de 30 dias confirmada também no banco, recarga e reinício completo do Chrome com armazenamento preservado, saída removendo token e quatro larguras sem rolagem lateral. Captura pu-sessao30-publico-390.png. Sessões antigas mantêm o prazo original; novo login recebe 30 dias. Testes usam perfil demonstrativo compartilhado, sem dados pessoais reais. Alterações preexistentes de infraestrutura mantidas fora do commit.

## Sincronização: leitura do catálogo no Docker — resolvido em 09/11/2026 14:26

A exportação atômica usava permissão 0600 do tempfile e o usuário sem privilégios do contêiner não podia lê-la. Exportação educacional alterada para 0644, montagem mantida somente leitura. Serviço saudável e teste de permissão em `tests/sincronizacao.py`. Dominique-Oliveira-ChatGPT🤖💚.

## Menu no celular — em investigação (2026-11-09T19:35:59-03:00)

Dominique informou que não viu a atualização. Versão pública entrega o menu novo; Chrome público confirmou recursos, login e três larguras. Teste autenticado com banco temporário passou em seis larguras e sete destinos. Resposta HTTP permite cache por 600 segundos; cache antigo é hipótese, ainda não causa confirmada. Menu está oculto sem sessão por implementação atual. Aguardando distinguir menu antigo, botão ausente após login ou tela de entrada. Não alterar autenticação nem declarar correção sem reproduzir. Dominique-Oliveira-ChatGPT🤖💚.

## Imagens das questões — correção local (2026-11-09T19:50:34-03:00)

Dominique pediu imagens automáticas somente nas questões com imagem cadastrada. Removido o botão e iniciado o carregamento a cada abertura, inclusive ao retornar. Preservados transporte autenticado em partes e bloqueio de resposta em texto parcial; carregamento antigo não altera a próxima tela. Chrome com API simulada: `tests/imagens-automaticas.cjs` aprovado; integração HTTP: 10 testes aprovados. Publicação não realizada nesta alteração. Dominique-Oliveira-ChatGPT🤖💚.

### Publicação das imagens automáticas — 2026-11-09T19:52:39-03:00

Dominique autorizou a publicação. Commit `4411856` publicado no Pages; Chrome HTTPS confirmou versão, chamada automática e remoção do botão no recurso entregue. Teste autenticado com questões reais não refeito nesta publicação. Dominique-Oliveira-ChatGPT🤖💚.

## Questões: texto, mídias e conjuntos — 10/11/2026

- Dominique-Oliveira-ChatGPT🤖💚: corrigidos prints integrais no banco, coordenadas MediaBox/CropBox, faixas decorativas e alternativas gráficas em duas colunas. O separador também corrige o acervo e roda antes da sincronização.
- Texto compartilhado é respondido em conjunto, com transação única e contagem individual. Testes: `tests/extracao.py`, `tests/conjuntos.py`, `tests/conjuntos-navegador.cjs` e `tests/conjuntos-reais.cjs`. Evidências e limites em `docs/CORRECAO-DAS-QUESTOES.md`.

## Plataforma fluida: fluxo de estudo refeito — 12/11/2026

Dominique-Oliveira-Claude🤖🧡, a pedido de Dominique Oliveira. Desenho, pesquisa e limites em `docs/PLATAFORMA-FLUIDA.md`. Cada item abaixo tem teste automático em `tests/fluida-navegador.mjs` (Chrome sem janela, banco temporário, sem gastar tokens) ou nos testes do servidor.

- Barreira para começar: era preciso passar por "Meu estudo" e "Questões" antes da primeira questão. Agora a questão abre ao entrar e ao voltar, a primeira do dia é curta e sem figura, e a tela é montada com o que ficou guardado no aparelho.
- Ordem fixa: a densidade fazia todas as questões de Português antes de qualquer outra matéria. Agora as matérias se alternam na proporção do catálogo e a densidade conta em qualquer ordem, com foco opcional por matéria ou assunto.
- Erros sem retorno: a questão errada não voltava. Agora volta depois de 1, 3 e 7 dias, junto com as marcadas como "Chutei".
- Alternativa marcada: sumia ao sair da tela ou quando a rede falhava. Agora é devolvida, e o reenvio não conta a resposta duas vezes.
- Leitura no celular: as quebras de linha do PDF cortavam as frases. Agora viram parágrafos, com versos, referência e comando separados.
- Simulado curto: corrigia questão por questão e perdia a rodada ao sair. Agora tem cronômetro, correção no fim e retomada.
- Progresso sem ação: mostrava números. Agora começa pelo próximo passo, com botão.
- Espera no acesso público: o conector consultava a fila uma vez por segundo e atendia um pedido por vez. Agora consulta a cada 0,3 s enquanto alguém estuda e atende quatro ao mesmo tempo; a resposta já traz a questão seguinte.
- Menu no celular: ficava atrás de um botão. Agora fica embaixo, sempre visível, com cinco destinos.

Rodar: `node tests/fluida-navegador.mjs` e os testes Python listados no documento.
