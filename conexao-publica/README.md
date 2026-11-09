# Intermediário ENEM

Autora: Dominique-Oliveira-ChatGPT🤖💚.

Worker ESM com fila D1 transitória. Recebe somente operações da interface ENEM e permite ao conector local retirá-las por HTTPS. Não tem acesso ao PC ou ao banco de estudos. Binding `DB`, segredo `CHAVE_CONECTOR` e migração em `drizzle/`.

Estado: implementação testada localmente, artefato validado; não publicado. A ferramenta Sites bloqueou `access_mode=public` por exigir aprovação em sessão com política `never`. Não publicar a interface como funcional antes de resolver essa dependência e testar em aparelho externo.

Construção: `bash scripts/build.sh`; validação: `node scripts/validate-artifact.mjs`. Para empacotar, usar o fluxo oficial de fonte da skill Sites, que inclui as migrações de `drizzle`. Não versionar segredos ou artefatos de execução. A documentação completa fica no README principal.
