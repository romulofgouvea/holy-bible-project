#!/usr/bin/env bash
# E2E visual/semântico do app (Expo Go via adb). Uso: bash scripts/e2e-run.sh [secao...]
# Seções: bible appearance picker search studies notes plan config draw collections stats
# Requer: adb com um aparelho conectado, Metro rodando e o app aberto no Expo Go.
# Dica: ligue "Não perturbe" antes, para banners de outros apps não entrarem nas capturas.

set -u
cd "$(dirname "$0")/.."
OUT="scripts/e2e-out"
mkdir -p "$OUT"

MENU="105 187"
BACK="103 187"
ARIA="876 187"
PASS=0
FAIL=0
FAILED=()

require_device() {
  if [ "$(adb get-state 2>/dev/null)" != "device" ]; then
    echo "Aparelho adb desconectado. Reconecte (depuração sem fio) e rode de novo."
    exit 2
  fi
}

ui() {
  MSYS_NO_PATHCONV=1 adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  MSYS_NO_PATHCONV=1 adb exec-out cat /sdcard/ui.xml
}

shot() { adb exec-out screencap -p >"$OUT/$1.png"; }
tap_xy() { adb shell input tap $1 $2; }
tap_pair() { adb shell input tap $1; }
wait_a_bit() { sleep "${1:-1.5}"; }

tap_text() {
  require_device
  local point
  point=$(ui | python scripts/e2e-ui.py find "$1" "${2:-0}") || return 1
  tap_pair "$point"
  wait_a_bit "${3:-1.5}"
}

has_text() { ui | python scripts/e2e-ui.py has "$1" >/dev/null 2>&1; }

check() {
  require_device
  local name="$1" text="$2"
  if has_text "$text"; then
    PASS=$((PASS + 1))
    echo "  ok   $name"
  else
    FAIL=$((FAIL + 1))
    FAILED+=("$name")
    echo "  FAIL $name (esperava ver: $text)"
    shot "fail-$(echo "$name" | tr ' /' '__')"
  fi
}

check_absent() {
  require_device
  local name="$1" text="$2"
  if has_text "$text"; then
    FAIL=$((FAIL + 1))
    FAILED+=("$name")
    echo "  FAIL $name (não deveria ver: $text)"
    shot "fail-$(echo "$name" | tr ' /' '__')"
  else
    PASS=$((PASS + 1))
    echo "  ok   $name"
  fi
}

open_drawer_item() {
  tap_pair "$MENU"
  wait_a_bit 1
  if [ "$1" = "Bíblia" ]; then
    tap_xy 385 519
    wait_a_bit 2
  else
    tap_text "$1" 0 2
  fi
  dismiss_donate
}

reload_app() {
  require_device
  adb shell input keyevent 46
  sleep 0.2
  adb shell input keyevent 46
  for _ in $(seq 1 60); do
    sleep 2
    if has_text "Bíblia Online"; then return 0; fi
  done
  echo "  FAIL app não abriu após o reload"
  FAIL=$((FAIL + 1))
  FAILED+=("reload")
}

dismiss_donate() { has_text "Apoie este Projeto" && tap_xy 948 597; }

dismiss_errors() { has_text "Dismiss" && tap_text "Dismiss" 0 1; }

section_bible() {
  echo "== 1. Bíblia (leitura)"
  open_drawer_item "Bíblia"
  check "titulo da leitura" "Bíblia Online"
  shot bible-top
  adb shell input swipe 540 1700 540 700 300
  wait_a_bit 1
  shot bible-scrolled
  check "cabecalho segue visivel" "Bíblia Online"
}

section_appearance() {
  echo "== 2. Aparência (Aa) e modo sem distração"
  open_drawer_item "Bíblia"
  wait_a_bit 2.5
  dismiss_donate
  tap_pair "$ARIA"
  wait_a_bit 2.5
  check "modal de aparencia" "Aparência (Aa)"
  check "secao texto" "Espaçamento entre Linhas"
  adb shell input swipe 540 1500 540 500 300
  wait_a_bit 1
  check "secao exibicao" "Modo sem distração"
  check "restaurar tudo" "Restaurar tudo"
  check "secao desenhos (antes rabiscos)" "Desenhos"
  check_absent "nome antigo rabiscos" "Rabiscos"
  adb shell input keyevent 4
  wait_a_bit 1
}

section_picker() {
  echo "== 3. Seletor de livro, capítulo e versículo"
  open_drawer_item "Bíblia"
  shot picker-before
  adb shell input tap 160 346
  wait_a_bit 1.5
  shot picker-book
  adb shell input keyevent 4
  wait_a_bit 1
}

section_search() {
  echo "== 4. Pesquisar"
  open_drawer_item "Pesquisar"
  check "titulo pesquisar" "Pesquisar"
  shot search
  tap_text "Pesquisar" 1 1
  adb shell input text "Jo%s3:16"
  wait_a_bit 1.5
  check "atalho de referencia" "João 3:16"
  shot search-reference
}

section_studies() {
  echo "== 5. Estudos (lista, editor, mover blocos)"
  open_drawer_item "Estudos"
  check "titulo estudos" "Estudos"
  shot studies-list
  tap_text "Dd" 0 3.5
  check "editor abriu" "Dd"
  shot study-editor
  tap_pair "$BACK"
  wait_a_bit 1.5
}

section_notes() {
  echo "== 6. Anotações (abas, busca, seleção, estudo)"
  open_drawer_item "Anotações"
  check "titulo anotacoes" "Anotações"
  check "aba texto" "Comentários"
  check "aba cores" "Cores"
  check "aba desenhos" "Desenhos"
  check "campo de busca" "Buscar nas anotações"
  shot notes-text
  tap_text "Cores" 0 1
  shot notes-colors
  tap_text "Desenhos" 0 1.5
  shot notes-drawings
  tap_text "Comentários" 0 1
  adb shell input swipe 538 880 538 880 900
  wait_a_bit 1
  check "selecao multipla" "selecionada"
  check "acao adicionar ao estudo" "Adicionar ao estudo"
  shot notes-selected
  tap_text "Adicionar ao estudo" 0 2
  check "seletor de estudo" "Adicionar ao Estudo"
  tap_text "Criar Novo Estudo" 0 1.5
  check "titulo sugerido" "Título do estudo"
  shot notes-title
  adb shell input keyevent 4
  wait_a_bit 1
}

section_plan() {
  echo "== 7. Plano de leitura (lista, detalhe, chip)"
  open_drawer_item "Plano de Leitura"
  check "titulo plano" "Plano de Leitura"
  shot plan-list
  tap_text "Cronológica" 0 2.5
  check "detalhe do plano" "PROGRESSO DE LEITURA"
  check "chips do dia" "Gênesis 1"
  shot plan-detail
  tap_pair "$BACK"
  wait_a_bit 1.5
}

section_config() {
  echo "== 8. Configurações, downloads, lixeira, changelog"
  open_drawer_item "Configurações"
  check "titulo configuracoes" "Configurações"
  check "lembrete de leitura" "Lembrete de leitura"
  shot config-top
  adb shell input swipe 540 1700 540 1100 300
  wait_a_bit 1
  check "modo sem distracao" "Modo leitura sem distração"
  shot config-bible-section
}

section_collections() {
  echo "== 15. Coleções"
  open_drawer_item "Coleções"
  check "titulo colecoes" "Coleções"
  check "estado vazio ou lista" "coleç"
  shot collections
}

section_stats() {
  echo "== 16. Estatísticas"
  open_drawer_item "Estatísticas"
  check "titulo estatisticas" "Estatísticas"
  check "progresso da biblia" "da Bíblia lida"
  check "sequencia atual" "Sequência atual"
  shot stats
}

section_draw() {
  echo "== 9. Desenho na Bíblia (barra, espessura, cores recentes)"
  open_drawer_item "Bíblia"
  wait_a_bit 2
  dismiss_donate
  tap_xy 540 1300
  wait_a_bit 1.5
  shot draw-actions
  tap_xy 629 1980
  wait_a_bit 2
  shot draw-toolbar
  check "botao concluir" "Concluir"
  tap_xy 366 2122
  wait_a_bit 1
  shot draw-width
  adb shell input swipe 366 1900 366 1650 300
  wait_a_bit 0.8
  shot draw-width-vertical
  tap_text "Concluir" 0 1.5
}

SECTIONS=("$@")
if [ ${#SECTIONS[@]} -eq 0 ]; then
  SECTIONS=(bible appearance picker search studies notes plan config draw collections stats)
fi

reload_app
for name in "${SECTIONS[@]}"; do
  dismiss_errors
  "section_$name"
done

echo
echo "Resultado: $PASS ok, $FAIL falhas"
if [ "$FAIL" -gt 0 ]; then
  printf ' - %s\n' "${FAILED[@]}"
  exit 1
fi
