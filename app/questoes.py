"""Catálogo ativo exclusivamente do cofre. Dominique-Oliveira-ChatGPT🤖💚."""
QUESTOES = []

# Exportação selecionada somente leitura; nunca monta o cofre na aplicação.
import json
import os
from pathlib import Path
CATALOGO = None
ARQUIVO_CATALOGO = os.environ.get('CATALOGO', '')
if ARQUIVO_CATALOGO:
    CATALOGO = json.loads(Path(ARQUIVO_CATALOGO).read_text())
    if CATALOGO.get('formato') != 1 or not isinstance(CATALOGO.get('questoes'), list):
        raise RuntimeError('Catálogo de questões inválido. Execute pu reiniciar.')
    QUESTOES = CATALOGO['questoes']
