#!/usr/bin/env bash
# ============================================================================
# Mac-wide storage cleaner (safe-by-default)
# ----------------------------------------------------------------------------
# Frees disk space across the whole user account:
#   - User caches, logs, trash
#   - Xcode DerivedData (ALL projects)
#   - npm / yarn / pnpm caches
#   - Homebrew cache + outdated formulae
#   - Docker dangling images & build cache  (NOT volumes by default)
#   - VS Code / Chrome / Safari caches
#   - Stray .DS_Store files in the home dir
#
# Safety-first design:
#   - DRY-RUN by default. Nothing is deleted unless --force is passed.
#   - Per-section flags so you can be surgical.
#   - Docker --volumes is OPT-IN (--docker-volumes) because it nukes DBs.
#   - Skips paths that are missing or that you don't own.
#
# Usage:
#   ./scripts/mac-clean.sh                # dry-run preview (default)
#   ./scripts/mac-clean.sh --force        # actually delete (everything safe)
#   ./scripts/mac-clean.sh --force --no-caches    # skip ~/Library/Caches
#   ./scripts/mac-clean.sh --force --docker-volumes  # ALSO nuke docker volumes
#   ./scripts/mac-clean.sh -h | --help
#
# Composable per-section flags (default = all sections ON):
#   --no-caches        --no-logs        --no-trash
#   --no-derived-data  --no-pkg-caches  --no-brew
#   --no-docker        --no-browsers    --no-dsstore
# ============================================================================

set -u
set -o pipefail

# ── Colours ────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_RESET="\033[0m"; C_BOLD="\033[1m"; C_DIM="\033[2m"
  C_RED="\033[31m"; C_GREEN="\033[32m"; C_YELLOW="\033[33m"
  C_BLUE="\033[34m"; C_CYAN="\033[36m"; C_MAGENTA="\033[35m"
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""
  C_YELLOW=""; C_BLUE=""; C_CYAN=""; C_MAGENTA=""
fi

# ── State / flags ─────────────────────────────────────────────────────────
FORCE=0
DOCKER_VOLUMES=0

DO_CACHES=1
DO_LOGS=1
DO_TRASH=1
DO_DERIVED=1
DO_PKG=1
DO_BREW=1
DO_DOCKER=1
DO_BROWSERS=1
DO_DSSTORE=1

TOTAL_FREED_BYTES=0

# ── Helpers ────────────────────────────────────────────────────────────────
header() {
  printf "%b\n" "${C_MAGENTA}${C_BOLD}━━━ $* ━━━${C_RESET}"
}
log()   { printf "%b\n" "${C_CYAN}▸${C_RESET} $*"; }
ok()    { printf "%b\n" "${C_GREEN}✓${C_RESET} $*"; }
warn()  { printf "%b\n" "${C_YELLOW}⚠${C_RESET} $*"; }
err()   { printf "%b\n" "${C_RED}✗${C_RESET} $*"; }
plan()  { printf "%b\n" "${C_YELLOW}~${C_RESET} ${C_DIM}would delete${C_RESET} $*"; }
hr()    { printf "%b\n" "${C_DIM}────────────────────────────────────────────────────────${C_RESET}"; }

bytes_of() {
  local p="$1"
  if [ -e "$p" ]; then
    # macOS du: -k = KB, multiply by 1024
    local kb
    kb=$(du -sk "$p" 2>/dev/null | awk '{print $1}')
    [ -z "$kb" ] && echo 0 || echo $((kb * 1024))
  else
    echo 0
  fi
}

human_size() {
  local bytes="$1"
  if [ "$bytes" -lt 1024 ]; then
    echo "${bytes}B"
  elif [ "$bytes" -lt 1048576 ]; then
    awk -v b="$bytes" 'BEGIN {printf "%.1fK", b/1024}'
  elif [ "$bytes" -lt 1073741824 ]; then
    awk -v b="$bytes" 'BEGIN {printf "%.1fM", b/1048576}'
  else
    awk -v b="$bytes" 'BEGIN {printf "%.2fG", b/1073741824}'
  fi
}

# Delete (or dry-run report) the *contents* of a directory, NOT the dir itself.
# This is safer than `rm -rf path/*` for hidden files & doesn't break the
# parent dir's permissions.
clean_dir_contents() {
  local target="$1"
  local label="${2:-$target}"

  if [ ! -d "$target" ]; then
    printf "%b\n" "${C_DIM}·${C_RESET} skip $label (not a directory)"
    return
  fi

  local bytes; bytes=$(bytes_of "$target")
  local hsz; hsz=$(human_size "$bytes")

  if [ "$bytes" -eq 0 ]; then
    printf "%b\n" "${C_DIM}·${C_RESET} skip $label (empty)"
    return
  fi

  if [ "$FORCE" -eq 0 ]; then
    plan "$label ${C_DIM}($hsz)${C_RESET}"
    TOTAL_FREED_BYTES=$((TOTAL_FREED_BYTES + bytes))
    return
  fi

  # Real delete — contents only, skip permission failures.
  if find "$target" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null; then
    ok "cleared $label ${C_DIM}($hsz)${C_RESET}"
    TOTAL_FREED_BYTES=$((TOTAL_FREED_BYTES + bytes))
  else
    warn "partial clear of $label (some items in use / no permission)"
  fi
}

run_or_plan() {
  local desc="$1"; shift
  if [ "$FORCE" -eq 0 ]; then
    plan "$desc ${C_DIM}(\$ $*)${C_RESET}"
    return
  fi
  printf "%b\n" "${C_BLUE}\$${C_RESET} ${C_DIM}$*${C_RESET}"
  "$@" >/dev/null 2>&1 && ok "$desc" || warn "$desc failed (non-fatal)"
}

# ── Sections ──────────────────────────────────────────────────────────────

sec_caches() {
  [ "$DO_CACHES" -eq 1 ] || return
  header "User caches"
  clean_dir_contents "$HOME/Library/Caches" "~/Library/Caches"
}

sec_logs() {
  [ "$DO_LOGS" -eq 1 ] || return
  header "Logs"
  clean_dir_contents "$HOME/Library/Logs" "~/Library/Logs"
}

sec_trash() {
  [ "$DO_TRASH" -eq 1 ] || return
  header "Trash"
  clean_dir_contents "$HOME/.Trash" "~/.Trash"
}

sec_derived_data() {
  [ "$DO_DERIVED" -eq 1 ] || return
  header "Xcode DerivedData (ALL projects)"
  local dd="$HOME/Library/Developer/Xcode/DerivedData"
  if [ -d "$dd" ]; then
    local sz; sz=$(human_size "$(bytes_of "$dd")")
    warn "this wipes build caches for EVERY Xcode project (current size: $sz)"
    clean_dir_contents "$dd" "~/Library/Developer/Xcode/DerivedData"
  else
    printf "%b\n" "${C_DIM}·${C_RESET} DerivedData folder missing"
  fi
}

sec_pkg_caches() {
  [ "$DO_PKG" -eq 1 ] || return
  header "Package manager caches"
  if command -v npm >/dev/null 2>&1; then
    run_or_plan "npm cache clean" npm cache clean --force
  fi
  if command -v yarn >/dev/null 2>&1; then
    run_or_plan "yarn cache clean" yarn cache clean
  fi
  if command -v pnpm >/dev/null 2>&1; then
    run_or_plan "pnpm store prune" pnpm store prune
  fi
  if command -v pod >/dev/null 2>&1; then
    run_or_plan "pod cache clean --all" pod cache clean --all
  fi
}

sec_brew() {
  [ "$DO_BREW" -eq 1 ] || return
  header "Homebrew"
  if command -v brew >/dev/null 2>&1; then
    run_or_plan "brew cleanup -s" brew cleanup -s
    local brew_cache; brew_cache=$(brew --cache 2>/dev/null)
    if [ -n "$brew_cache" ] && [ -d "$brew_cache" ]; then
      clean_dir_contents "$brew_cache" "brew --cache ($brew_cache)"
    fi
  else
    printf "%b\n" "${C_DIM}·${C_RESET} brew not installed"
  fi
}

sec_docker() {
  [ "$DO_DOCKER" -eq 1 ] || return
  header "Docker"
  if ! command -v docker >/dev/null 2>&1; then
    printf "%b\n" "${C_DIM}·${C_RESET} docker not installed"
    return
  fi
  if ! docker info >/dev/null 2>&1; then
    warn "docker daemon not running — skipping"
    return
  fi
  if [ "$DOCKER_VOLUMES" -eq 1 ]; then
    warn "INCLUDING --volumes — stopped containers' DB data will be wiped"
    run_or_plan "docker system prune -af --volumes" docker system prune -af --volumes
  else
    run_or_plan "docker system prune -af (volumes preserved)" docker system prune -af
  fi
}

sec_browsers() {
  [ "$DO_BROWSERS" -eq 1 ] || return
  header "Browser caches"
  clean_dir_contents "$HOME/Library/Caches/com.apple.Safari"     "Safari cache"
  clean_dir_contents "$HOME/Library/Caches/com.google.Chrome"    "Chrome system cache"
  clean_dir_contents "$HOME/Library/Application Support/Google/Chrome/Default/Cache" \
                                                                 "Chrome profile cache"
  clean_dir_contents "$HOME/Library/Application Support/Code/logs" "VS Code logs"
  clean_dir_contents "$HOME/Library/Application Support/Cursor/logs" "Cursor logs"
}

sec_dsstore() {
  [ "$DO_DSSTORE" -eq 1 ] || return
  header ".DS_Store cleanup"
  # Count first; -delete is silent on misses but slow on huge trees.
  local count
  count=$(find "$HOME" -type f -name ".DS_Store" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -eq 0 ]; then
    printf "%b\n" "${C_DIM}·${C_RESET} no .DS_Store files found"
    return
  fi
  if [ "$FORCE" -eq 0 ]; then
    plan "$count .DS_Store files in \$HOME"
    return
  fi
  log "deleting $count .DS_Store files (may take a moment)..."
  find "$HOME" -type f -name ".DS_Store" -delete 2>/dev/null
  ok "removed $count .DS_Store files"
}

# ── Pre-flight summary ────────────────────────────────────────────────────

show_disk_before() {
  hr
  printf "%b\n" "${C_BOLD}Disk before:${C_RESET}"
  df -h / | awk 'NR==1 || NR==2 {printf "  %s\n", $0}'
  hr
}

show_disk_after() {
  hr
  printf "%b\n" "${C_BOLD}Disk after:${C_RESET}"
  df -h / | awk 'NR==1 || NR==2 {printf "  %s\n", $0}'
  hr
}

# ── Arg parsing ───────────────────────────────────────────────────────────

show_help() {
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force)           FORCE=1 ;;
    --docker-volumes)  DOCKER_VOLUMES=1 ;;
    --no-caches)       DO_CACHES=0 ;;
    --no-logs)         DO_LOGS=0 ;;
    --no-trash)        DO_TRASH=0 ;;
    --no-derived-data) DO_DERIVED=0 ;;
    --no-pkg-caches)   DO_PKG=0 ;;
    --no-brew)         DO_BREW=0 ;;
    --no-docker)       DO_DOCKER=0 ;;
    --no-browsers)     DO_BROWSERS=0 ;;
    --no-dsstore)      DO_DSSTORE=0 ;;
    -h|--help)         show_help; exit 0 ;;
    *) err "unknown flag: $1"; show_help; exit 1 ;;
  esac
  shift
done

# ── Run ────────────────────────────────────────────────────────────────────

printf "%b\n" "${C_BOLD}Mac storage cleaner${C_RESET}"
if [ "$FORCE" -eq 0 ]; then
  printf "%b\n" "${C_YELLOW}DRY-RUN${C_RESET} — pass ${C_BOLD}--force${C_RESET} to actually delete."
else
  printf "%b\n" "${C_RED}${C_BOLD}LIVE RUN${C_RESET} — files will be deleted."
fi

show_disk_before

sec_caches
sec_logs
sec_trash
sec_derived_data
sec_pkg_caches
sec_brew
sec_docker
sec_browsers
sec_dsstore

hr
if [ "$FORCE" -eq 0 ]; then
  printf "%b\n" "${C_BOLD}Would free approximately:${C_RESET} $(human_size "$TOTAL_FREED_BYTES")"
  printf "%b\n" "${C_DIM}(does not include docker/brew/pkg cache reclaim — those show up after --force)${C_RESET}"
  printf "%b\n" "Rerun with ${C_BOLD}--force${C_RESET} to apply."
else
  show_disk_after
  ok "${C_BOLD}cleanup complete${C_RESET}"
  printf "%b\n" "${C_DIM}Restart recommended if you cleared ~/Library/Caches.${C_RESET}"
fi
