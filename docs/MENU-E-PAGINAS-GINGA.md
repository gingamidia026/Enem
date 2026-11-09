# Menu e páginas do PU

Autora: Dominique-Oliveira-ChatGPT🤖💚. Data: 09/11/2026.

Pedido de Dominique: usar a mesma estrutura de menu da Ginga e uma estrutura semelhante nas páginas.

Objetivo: facilitar a navegação do estudante mantendo o conteúdo e as funções de estudo do PU.

Implementação: marca à esquerda e navegação no cabeçalho; menu horizontal em telas largas, botão de abertura em celular/tablet, lista vertical abaixo do cabeçalho. Fecha ao selecionar destino, clicar fora ou pressionar Escape; Escape devolve o foco ao botão. Botão e menu ocultos sem sessão. Conteúdo em coluna central, abertura com título, blocos separados por espaçamento e linhas. Identidade visual e folha de questões do PU preservadas. Entradas local e pública atualizadas juntas.

Verificação: `tests/menu-navegador.cjs` usa Chrome e banco temporário, sem contas reais. Abrange seis larguras, sete destinos, seleção atual, Escape/foco, cadastro, saída e console. `python3 tests/testar.py`: dez testes aprovados, incluindo isolamento e restrições de acesso. Revisão de segurança offline: mudanças limitadas à apresentação, sem mudança de API, autenticação ou permissões.

Limites: conferência automatizada no Chrome sem janela; não há ferramenta de controle do Chrome interativo nesta sessão. Alterações locais, sem publicação ou reinício do ambiente em uso.
