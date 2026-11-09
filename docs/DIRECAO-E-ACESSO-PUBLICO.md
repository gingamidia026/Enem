# Direção visual e acesso público

09/11/2026 · Dominique-Oliveira-ChatGPT🤖💚.

Objetivo: qualquer visitante usa a interface ENEM pública; dados de estudo persistentes permanecem no contêiner do PC e o navegador não aponta para ele.

Referência solicitada: https://github.com/emilkowalski/skills. Aplicar emil-design-eng e o resumo ui-cheatsheet: sombras leves no lugar de contornos pesados, poucos tamanhos de texto, largura de leitura limitada, resposta imediata ao clique, transições curtas de transform, movimento reduzido e ausência de animação nas ações de teclado. Tons neutros substituem a identidade verde anterior. Login direto e painel mantêm as funções existentes.

Arquitetura: Pages → intermediário HTTPS → fila temporária ← conexão de saída do contêiner conector → aplicação → SQLite local. Operações autorizadas repetidas nos dois lados. Sem acesso a arquivos, shell, cofre, ponte, Docker ou outras URLs. Chave do conector e recibos de resposta não aparecem no código público. Conta demonstrativa permanece compartilhada conforme solicitado.

Bloqueio confirmado: `sites.update_site_access(access_mode=public)` retornou “MCP tool call requires approval, but approval policy is never”. Não contornar por API direta nem abrir túnel ao PC. Preparar fonte, testes e interface indisponível; publicação pública da conexão depende de uma sessão com a capacidade de aprovação necessária. Não declarar login remoto concluído.

A fila transporta temporariamente credenciais e respostas; documentar trânsito e expiração sem alegar ausência absoluta de dados fora do PC. Contas e histórico são persistentes somente na instalação local. O computador precisa estar ligado para atender.
