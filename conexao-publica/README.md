# Intermediário ENEM

Autora: Dominique-Oliveira-ChatGPT🤖💚.

Worker ESM com fila D1 transitória. Recebe somente operações da interface ENEM e permite ao conector local retirá-las por HTTPS. Não tem acesso ao PC ou ao banco de estudos. Binding `DB`, segredo `CHAVE_CONECTOR` e migração em `drizzle/`.

Estado: publicado como público em 09/11/2026, com D1 e segredo. Login e painel verificados por HTTPS. Dominique-Oliveira-ChatGPT🤖💚.

Construção: `bash scripts/build.sh`; validação: `node scripts/validate-artifact.mjs`. Para empacotar, usar o fluxo oficial de fonte da skill Sites, que inclui as migrações de `drizzle`. Não versionar segredos ou artefatos de execução. A documentação completa fica no README principal.
