# Verificação da primeira versão

Autora: Dominique-Oliveira-ChatGPT🤖💚. Data: 09/11/2026.

- Integração HTTP com banco temporário: cadastro, login, sessão, logout e persistência; duas contas com históricos distintos; gabarito ausente antes da resposta; alternativas inválidas recusadas; origem externa bloqueada; arquivos privados inacessíveis; limite de tentativas de login.
- Docker: imagem construída e serviços iniciados, saúde da API confirmada. Inspeção: usuário 10001, raiz somente para leitura, todas as capacidades removidas, apenas volume próprio em `/dados` na aplicação.
- Chrome automatizado: cadastro, treino, retorno à lista, simulado completo, progresso, saída e ausência de erros JavaScript. Larguras 320, 360, 390, 412, 768 e 1440 sem rolagem lateral na tela inicial autenticada. Capturas em 390, 768 e 1440 revisadas visualmente.
- A moldura por iframe foi recusada pelos cabeçalhos de proteção. O teste foi adaptado para viewport real, preservando essa proteção. Não houve conferência manual no Chrome interativo nem em aparelhos físicos.
- Configuração de produção validada com domínio de exemplo; hospedagem, emissão de certificado, restauração de backup e carga de produção ainda não foram verificadas em servidor real.

## Reproduzir

```sh
python3 tests/testar.py
docker compose up -d --build
npm install --prefix /tmp/enem-verificacao --cache /tmp/enem-npm-cache playwright-core --no-audit --no-fund
PLAYWRIGHT_MODULO=/tmp/enem-verificacao/node_modules/playwright-core node tests/navegador.cjs
```

O teste de navegador requer Chrome no caminho `/opt/google/chrome/chrome` ou variável `CHROME`. Cria uma conta de teste única no banco local e salva capturas em `docs/`. Não executar contra produção.

## Alteração solicitada em 09/11/2026

Login local `teste` / `123`, perfil Teste, com acesso a treino, simulado e progresso. Cadastro individual continua com senha longa. Teste HTTP verifica senha incorreta, entrada correta, resposta persistida e bloqueio do perfil/sessão quando a opção de teste é desativada. O perfil é compartilhado, sem promessa de isolamento entre pessoas usando as mesmas credenciais.

Comando `enem` com iniciar, parar, reiniciar, status, logs e ajuda; instalador sem sobrescrita de outro comando. O atalho foi testado em diretório temporário permitido. A instalação definitiva em `~/.local/bin` depende da execução do instalador pela Dominique, porque essa pasta está fora das raízes de escrita desta sessão.

Correção de arquitetura: dados permanecem no volume Docker deste PC, sem sincronização com GitHub/nuvem. O acesso continua local; nenhuma conexão pública foi ativada. O navegador solicita os dados das rotas autenticadas. Autora: Dominique-Oliveira-ChatGPT🤖💚.

## Correção do endereço GitHub Pages

09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚 · Entrada estática na raiz com CSS relativo e botão para a aplicação local. Teste automatizado verifica arquivo, recurso CSS e destino do login. Não exportar o banco nem simular uma conexão remota. O fluxo de login permanece na origem local, preservando os controles de origem existentes. Limite: acesso pelo botão só funciona no aparelho que executa o contêiner; outros aparelhos exigem conexão adicional.

## Visual Emil e conexão somente de saída

09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚.

- Seis testes HTTP/arquivos/lista de rotas aprovados. O conector recusa caminhos de arquivos, terminal, URLs externas, métodos arbitrários e travessia de diretórios.
- Worker testado contra SQLite em memória: origem permitida, autenticação do conector, lista de operações, indisponibilidade offline, retirada única, recibo imprevisível, resultado consumido e limpeza de expirados.
- Imagem Docker do conector construída; configuração Compose com rede de saída validada. O serviço não foi iniciado: ativação exige marcador explícito e confirmação do intermediário público.
- Chrome: fluxo local completo com o novo visual; Pages sem link local e com aviso de indisponibilidade. Transporte público simulado para testar a interface contra API local real. Isso não é teste de conexão pública hospedada.
- Publicação do intermediário bloqueada: a ferramenta `sites.update_site_access` informou que precisa de aprovação, mas a política da sessão é `never`. Não houve tentativa por API alternativa ou abertura de porta/túnel para contornar isso. Site público mantém o login indisponível de forma explícita.

### Revisão visual conforme a referência solicitada

| Antes | Depois | Motivo |
| --- | --- | --- |
| Verde e título amplo | Neutros e título contido | Facilitar o uso frequente do aplicativo |
| Contornos e preenchimentos fortes | Sombras suaves e contraste de texto | Reduzir peso visual |
| Clique sem indicação | Pressão de 140 ms no ponteiro | Confirmar a ação de forma breve |
| Mesmo efeito para todo dispositivo | Teclado sem animação e hover só no mouse | Evitar demora e estados presos no toque |
| Entrada pelo localhost | Interface pública sem endereço do PC | Não confundir acesso remoto com acesso local |

Referência: https://github.com/emilkowalski/skills. Foram aplicados princípios; não foi copiada uma marca de terceiros.

## Skill apple-design aplicada

09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚.

Fonte: https://github.com/emilkowalski/skills/tree/main/skills/apple-design. Aplicação à interface existente: material translúcido no cabeçalho e navegação, fonte do sistema com dimensões em rem, agrupamento, controles de toque, feedback imediato e estados de carregamento/erro. A escolha de resposta recebe indicação textual após a correção e o progresso usa medidor nativo quando há tentativas reais.

Conferência: fluxo local completo e fluxo público com transporte simulado/API real passaram no Chrome; seis larguras sem rolagem lateral. Teste adicional da fonte a 200% em 320, 390 e 768 px revelou crescimento excessivo do cabeçalho. Corrigido retirando a legenda secundária em telas estreitas; nova medição confirmou a altura prevista e evitou sobreposição com a navegação. Preferências de movimento, transparência reduzida e contraste reforçado verificadas por emulação no Chrome. Ainda não conferido em aparelhos físicos.

A aplicação visual não altera o banco, os controles de origem ou a configuração pública. A mensagem `approval_policy = "on-request"` enviada pela Dominique não modifica a política ativa `never`; a dependência de liberação do intermediário permanece registrada.

## Nome e comandos atuais: Vestibular para Todos (VPT)

09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚 · Este registro substitui as pendências antigas sobre a instalação do comando: `vpt` está instalado e foi executado com sucesso, com os três serviços saudáveis. O controlador principal é `./vpt`. Documentação de operação no README. Nove testes Python aprovados; Chrome confirmou título, nome completo com sigla e ausência de rolagem lateral em 320, 390, 768 e 1440 px. Captura de 390 px revisada visualmente. A interface estática também recebeu o nome, mas não foi enviada ao GitHub nesta alteração. Identificadores técnicos e volume preservados.
