# Plataforma ENEM

Autora: Dominique-Oliveira-ChatGPT🤖💚

Objetivo: estudantes praticam questões e acompanham acertos pelo navegador. O servidor mantém contas, sessões, gabaritos e histórico. Primeira versão com cadastro, login, treino por área, simulado curto e progresso individual. Conteúdo inicial autoral demonstrativo, sem alegação de ser prova oficial ou nota TRI.

Arquitetura: navegador → HTTPS/Caddy → aplicação Python → SQLite em volume Docker exclusivo. Sem cofre, ponte, terminal, socket Docker ou pastas do computador. Hospedagem pública em servidor separado, nunca encaminhar portas do computador pessoal.

Etapas: estrutura isolada; autenticação e API; interface responsiva clara em verde e neutros; testes de isolamento entre contas, gabaritos, sessões e entrada; construção Docker; publicação no GitHub solicitado. Implementação e revisão pelo ChatGPT, esforço alto, sem delegação por serem etapas dependentes.

Direção: menu lateral no computador, navegação em linha no celular, tarefa de estudo em destaque. Fundo claro, verde escuro #175442, papel #f5f4ee, texto #202b26, borda #cbd6ce; fonte do sistema. Sem números fictícios de desempenho.

Pendências de operação: servidor e domínio, política de privacidade/retenção e conteúdo pedagógico definitivo. Professores, redação e catálogo completo dependem da definição de escopo. Não habilitar acesso público antes de HTTPS e revisão operacional.
