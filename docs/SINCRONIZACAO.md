# Questões do cofre no PU

Autora: Dominique-Oliveira-ChatGPT🤖💚. Implementado em 09/11/2026.

`pu`, `pu iniciar`, `pu ligar` e `pu reiniciar` executam primeiro `scripts/sincronizar-questoes.py`. Esse programa usa somente a biblioteca padrão do Python, sem IA, rede, API de modelos ou tokens. Depois, o comando reconstrói/inicia os serviços com o catálogo atualizado. Os volumes de contas e respostas são preservados.

A origem é a pasta `Provas Enem/Questões` do cofre Vestibular, com uma nota Markdown por questão, conforme o importador existente. Imagens vêm somente de `Matérias/Flashcards/Imagens exercícios`. A variável opcional `PU_COFRE_VESTIBULAR` permite indicar outra raiz local. Adicionar uma carta isolada em Flashcards não cria uma questão: é necessária a nota com ano, dia, caderno, número, área, gabarito, texto e imagens correspondentes.

Inclusões, exclusões e alterações nas notas são refletidas no próximo início/reinício pelo comando PU. Atualize a página aberta no navegador para obter o catálogo novo. `docker restart` direto ou o reinício automático do Docker leem a última exportação; não executam o exportador do computador.

O catálogo selecionado fica em `.catalogo/`, ignorado pelo Git e pelo contexto de construção Docker, montado apenas em leitura na aplicação. O cofre inteiro não é montado. Não existe envio automático ao GitHub, classificação por IA ou consulta externa no processo. Notas em revisão mantêm o aviso; anuladas ficam fora do treino. Quando a extração de alternativas é ambígua, o texto é preservado e a interface exige carregar a imagem original antes de enviar a resposta.

Os identificadores são registrados pela identidade lógica ano/dia/caderno/número, sem reutilização. Remover uma questão tira-a do catálogo ativo, mantendo o histórico de respostas. Reintroduzir a mesma identidade recupera o mesmo ID. Imagens imutáveis e identidades removidas permanecem no armazenamento local para não quebrar referências; não há limpeza destrutiva automática. O catálogo vazio é válido quando a pasta de questões existe e suas notas foram removidas; ele não reapresenta questões demonstrativas.

Se o cofre estiver indisponível, houver nota inválida, identidade duplicada, imagem ausente ou tentativa de caminho fora das pastas autorizadas, o programa termina com erro antes do reinício. A exportação anterior fica preservada. Corrija a nota indicada e execute `pu reiniciar` novamente. O índice é trocado atomicamente; imagens são copiadas antes dele. Uma trava impede duas sincronizações simultâneas. Arquivos exportados de conteúdo educacional têm leitura para o usuário sem privilégios do contêiner; catálogo não inclui agenda pessoal, relatórios, senhas ou dados de contas.

As imagens originais são consultadas por ação autenticada na rota existente de questão, em partes de 48 KiB (até cerca de 66 KiB após Base64), respeitando o limite da fila pública. O visitante não recebe caminho do cofre ou acesso a arquivos arbitrários. Carregar imagens grandes pode levar alguns segundos e consome requisições da conexão pública, embora não consuma tokens de IA. O acesso público continua dependendo do PC ligado.

Conferência: `python3 tests/sincronizacao.py` testa inclusão, exclusão, reinclusão com ID estável, catálogo vazio, anulações, erro sem troca do índice, rejeição de caminho indevido, execução automática do reinício com Docker simulado e API real temporária preservando sessão/histórico após remover questão. `node tests/simulador.cjs` verifica as médias. Os testes HTTP existentes continuam em `python3 tests/testar.py`.
