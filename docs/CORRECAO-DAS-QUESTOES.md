# Correção local das questões do PU

Autora: Dominique-Oliveira-ChatGPT🤖💚. Verificação: 10/11/2026.

O separador original foi reformulado e recebeu a operação `corrigir`. Importação e correção usam a mesma função `recortar`, no PC, fora do Docker. O código mantido no projeto está em `ferramentas/importar-prova`; a versão instalada no cofre fica em `.claude/skills/importar-prova`. O ambiente Python local está em `.venv-extracao`, excluído do Git e do Docker.

## Funcionamento

- Texto e alternativas permanecem em texto. Figuras, gráficos, tabelas e fórmulas que dependem da disposição visual são recortados e inseridos no trecho correspondente, inclusive nas alternativas.
- As coordenadas de extração e renderização usam a mesma MediaBox. Faixas decorativas dos cadernos são descartadas. Alternativas gráficas em duas colunas são associadas pelas letras e separadas em células.
- Textos comuns têm um identificador de conjunto e IDs individuais de questões. O servidor exige o envio completo, grava todas as respostas na mesma transação e evita duplicações por repetição do envio. O ciclo conta cada pergunta individualmente.
- `pu`, `pu iniciar` e `pu reiniciar` chamam `scripts/corrigir-questoes.py --aplicar` antes de exportar. A ferramenta valida uma preparação isolada antes de escrever no cofre. Arquivos e mídias anteriores têm cópia recuperável; o histórico de revisão das cartas é mantido.
- A assinatura dos PDFs e da ferramenta evita repetir a extração quando não houve mudança. Fontes alteradas são reprocessadas; uma mudança no extrator invalida a preparação anterior. Uma trava impede duas correções simultâneas pelo controlador.
- Processamento e sincronização não chamam modelos, não usam tokens de IA e não dependem de rede. O modo antigo `preparar` pode baixar um gabarito ausente; o modo de correção lê a fonte e os metadados locais existentes.

## Acervo conferido

Quatro cadernos oficiais locais: Enem 2024 e 2025, dias 1 (caderno 1) e 2 (caderno 7). As 360 notas correspondem a esses arquivos. A exportação contém 356 questões de treino e quatro anuladas excluídas do treino. Foram mantidos os IDs e as classificações; 34 classificações continuam marcadas para revisão, sem inventar matéria ou solução.

O conjunto real `2025_PV_impresso_D1_CD1:Q06a10` reúne cinco perguntas. Os 373 prints integrais sem referências ativas foram retirados da pasta de imagens e preservados em `.backups/prints-substituidos-20261110T104333` no cofre. As notas e cartas anteriores estão em `.backups/correcao-pu-20261110T134013265470Z`.

A aplicação não carrega mais questões autorais demonstrativas quando não há catálogo. Os dados sintéticos necessários aos testes ficam exclusivamente em `tests/questoes_sinteticas.py`, excluídos da imagem Docker. Não foram encontradas outras notas de questões no diretório do banco para excluir por origem. Se “livros recentes” designar outros arquivos além dos quatro cadernos encontrados, a seleção de origens precisa ser revista antes de qualquer exclusão adicional.

## Evidências e limites

- `tests/extracao.py`: 12 regressões em amostras reais, incluindo repetição determinística, tabela, figuras, fórmulas, opções em duas colunas, texto compartilhado e preservação de carta/histórico/cópia.
- `tests/conjuntos.py`: integração HTTP de envio completo, rejeição sem gravação parcial, contagem individual e repetição sem duplicação; inclui regressões de sincronização.
- `tests/testar.py`: dez verificações HTTP de acesso, persistência e isolamento, usando catálogo sintético explícito em banco temporário.
- `tests/acompanhamento.py`: três regressões do ciclo e perfil.
- `tests/conjuntos-navegador.cjs`: Chrome com API simulada, conjunto de cinco, imagens automáticas e larguras 390, 768 e 1440.
- `tests/conjuntos-reais.cjs`: Chrome com catálogo real somente leitura e conta em banco temporário separado; nenhuma resposta de teste é gravada nas contas reais.

A aprovação estrutural das 360 questões não equivale à revisão humana de cada símbolo de todos os cadernos. Amostras visuais foram comparadas durante os ajustes. PDFs totalmente digitalizados sem camada de texto não têm OCR implementado nesta versão: a ausência de questões completas impede a aplicação, em vez de aprovar prints integrais. Outros formatos de livros e textos compartilhados sem identificação explícita de intervalo ainda precisam de amostras e testes próprios. O funcionamento real confirmado se refere aos quatro cadernos acima.
