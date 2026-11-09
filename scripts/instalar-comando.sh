#!/usr/bin/env bash
# Instala somente o atalho; não altera arquivos de configuração do terminal.
set -euo pipefail
PASTA_ENEM="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO_ENEM="${ENEM_BIN_DIR:-$HOME/.local/bin}"
mkdir -p -- "$DESTINO_ENEM"
if [[ -e "$DESTINO_ENEM/enem" || -L "$DESTINO_ENEM/enem" ]]; then
  if [[ "$(readlink -f -- "$DESTINO_ENEM/enem")" != "$PASTA_ENEM/enem" ]]; then
    echo "Já existe outro comando em $DESTINO_ENEM/enem; nenhum arquivo foi substituído." >&2
    exit 1
  fi
else
  ln -s -- "$PASTA_ENEM/enem" "$DESTINO_ENEM/enem"
fi
printf 'Comando instalado: %s/enem\n' "$DESTINO_ENEM"
case ":$PATH:" in *":$DESTINO_ENEM:"*) echo 'Pronto: digite enem.' ;; *) echo "Inclua $DESTINO_ENEM no PATH do seu terminal." ;; esac
