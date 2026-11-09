# Lista de correções do ENEM

Autora: Dominique-Oliveira-ChatGPT🤖💚.

1. 09/11/2026: endereço GitHub Pages sem a entrada da plataforma. Causa: repositório Docker sem index.html na raiz; os arquivos da aplicação usavam rotas locais. Correção: entrada estática na raiz, caminhos relativos e botão que abre o login da aplicação local. Testes: arquivo e recurso CSS presentes, botão destinado à aplicação local; navegação Pages → aplicação local → autenticação no Chrome. Acesso de outros aparelhos continua dependente da conexão com o PC e não deve ser declarado disponível.

2. 09/11/2026: visitante público recebia link para localhost, que apontava para o próprio aparelho. Removido. A raiz passa a renderizar a interface real e o login, com aviso de indisponibilidade até ativar o intermediário de saída. Não fingir que localhost alcança o computador da Dominique. Conexão pública bloqueada por exigência de aprovação da ferramenta Sites; pendência explícita, sem contorno por túnel.
