#!/bin/zsh
# Confere contra a API o que REALMENTE está publicado, comparando o
# content-length de cada objeto com o arquivo local correspondente.
#
# Existe porque marcador local mente: o fluxo anterior tinha `.subiu` dizendo
# 309 enviadas enquanto o R2 servia 2646, e ninguém percebeu até alguém sondar
# a API. O `wrangler` não lista objetos do R2 — HEAD na API é o único
# inventário confiável.
#
# Uso: scripts/conferir-narracao.sh [origem] [prefixo]

set -u

CORPUS="${TTS_CORPUS:-/Volumes/SSD 2TB SD/dev/tts-corpus}"
ORIGEM="${1:-$CORPUS/gam-ash1}"
PREFIXO="${2:-gam-ash1}"
API="${API_BASE:-https://biblia-pericopes.jairofilho79.workers.dev}"
LISTA="$ORIGEM/ordens.txt"

tam_remoto() {  # tam_remoto <chave>
  curl -sI --max-time 30 "$API/api/audio/$1" | tr -d '\r' \
    | awk -F': ' 'tolower($1)=="content-length"{print $2}'
}

ok=0; ausente=0; divergente=0
: > "$ORIGEM/divergencias.txt"
while read -r ordem; do
  [[ -n "$ordem" ]] || continue
  d=$(printf "%s/%04d" "$ORIGEM" "$ordem")
  for par in "m4a:pericope.m4a" "json:manifest.json"; do
    ext="${par%%:*}"; arq="${par#*:}"
    local_b=$(stat -f%z "$d/$arq" 2>/dev/null || echo 0)
    remoto_b=$(tam_remoto "$PREFIXO/$ordem.$ext")
    if [[ -z "$remoto_b" ]]; then
      echo "AUSENTE   $PREFIXO/$ordem.$ext" >> "$ORIGEM/divergencias.txt"; ((ausente++))
    elif [[ "$remoto_b" != "$local_b" ]]; then
      echo "DIVERGE   $PREFIXO/$ordem.$ext  local=$local_b remoto=$remoto_b" >> "$ORIGEM/divergencias.txt"
      ((divergente++))
    else
      ((ok++))
    fi
  done
done < "$LISTA"

echo "objetos conferidos e idênticos: $ok"
echo "ausentes no R2:                 $ausente"
echo "com tamanho divergente:         $divergente"
[[ $ausente -eq 0 && $divergente -eq 0 ]] \
  && echo "PUBLICAÇÃO ÍNTEGRA" \
  || { echo "PROBLEMAS em $ORIGEM/divergencias.txt"; exit 1 }
