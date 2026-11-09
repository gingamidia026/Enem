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
