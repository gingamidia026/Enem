#!/usr/bin/env bash
# Instala somente o atalho; não altera arquivos de configuração do terminal.
set -euo pipefail
PASTA_ENEM="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO_ENEM="${ENEM_BIN_DIR:-$HOME/.local/bin}"
mkdir -p -- "$DESTINO_ENEM"
# Dominique-Oliveira-ChatGPT🤖💚 — instala o comando Pé na Universidade (PU).
for comando in pu vpt; do
  if [[ -e "$DESTINO_ENEM/$comando" || -L "$DESTINO_ENEM/$comando" ]]; then
    if [[ "$(readlink -f -- "$DESTINO_ENEM/$comando")" != "$PASTA_ENEM/enem" && "$(readlink -f -- "$DESTINO_ENEM/$comando")" != "$PASTA_ENEM/vpt" ]]; then
      echo "Já existe outro comando em $DESTINO_ENEM/$comando; nenhum arquivo foi substituído." >&2
      exit 1
    fi
  fi
done
for comando in pu vpt; do
  if [[ ! -e "$DESTINO_ENEM/$comando" && ! -L "$DESTINO_ENEM/$comando" ]]; then
    ln -s -- "$PASTA_ENEM/vpt" "$DESTINO_ENEM/$comando"
  fi
  printf 'Comando instalado: %s/%s\n' "$DESTINO_ENEM" "$comando"
done
case ":$PATH:" in *":$DESTINO_ENEM:"*) echo 'Pronto: digite pu.' ;; *) echo "Inclua $DESTINO_ENEM no PATH do seu terminal." ;; esac
