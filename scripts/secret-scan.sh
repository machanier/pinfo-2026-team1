#!/usr/bin/env bash
# UNIGEvents — Local secret scanner
#
# Two-tier scan:
#   1. gitleaks (preferred) — uses upstream rules + project overrides.
#   2. ripgrep / grep fallback — runs when gitleaks isn't installed,
#      catches the placeholder-style tokens that gitleaks defaults miss
#      (e.g. internal.service.key=unigevents-internal-secret).
#
# Modes:
#   ./scripts/secret-scan.sh                 # scan staged + working tree
#   ./scripts/secret-scan.sh --all           # scan full git history
#   ./scripts/secret-scan.sh --pre-commit    # scan only staged files
#   ./scripts/secret-scan.sh --install-hook  # symlink as .git/hooks/pre-commit
#
# Exits non-zero on any finding (suitable as pre-commit hook).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

MODE="working-tree"
case "${1:-}" in
  --all)          MODE="history" ;;
  --pre-commit)   MODE="staged" ;;
  --install-hook) MODE="install-hook" ;;
  --help|-h)
    sed -n '2,18p' "$0"; exit 0 ;;
  "") ;;
  *)  echo "unknown flag: $1 (try --help)"; exit 2 ;;
esac

if [[ "$MODE" == "install-hook" ]]; then
  HOOK="$REPO_ROOT/.git/hooks/pre-commit"
  if [[ -e "$HOOK" && ! -L "$HOOK" ]]; then
    echo "refusing to overwrite existing $HOOK — move it aside first"; exit 1
  fi
  ln -sfn "../../scripts/secret-scan.sh" "$HOOK"
  chmod +x "$REPO_ROOT/scripts/secret-scan.sh"
  echo "pre-commit hook installed → runs secret-scan.sh --pre-commit"
  exit 0
fi

# When invoked by git as the pre-commit hook itself (no args), behave as --pre-commit.
if [[ -n "${GIT_INDEX_FILE:-}" && -z "${1:-}" ]]; then
  MODE="staged"
fi

YELLOW=$'\033[1;33m'; RED=$'\033[1;31m'; GREEN=$'\033[1;32m'; RESET=$'\033[0m'
findings=0
report() { findings=$((findings+1)); printf "%s[FOUND]%s %s\n" "$RED" "$RESET" "$*"; }
note()   { printf "%s[note]%s %s\n" "$YELLOW" "$RESET" "$*"; }
ok()     { printf "%s[ok]%s %s\n" "$GREEN" "$RESET" "$*"; }

# ─────────────────────────────────────────────────────────────────
# Tier 1 — gitleaks (if available)
# ─────────────────────────────────────────────────────────────────
if command -v gitleaks >/dev/null 2>&1; then
  note "gitleaks $(gitleaks version 2>/dev/null | head -1) detected"
  case "$MODE" in
    history)
      gitleaks detect --source . --redact --no-banner --verbose || findings=$((findings+1)) ;;
    staged)
      gitleaks protect --staged --redact --no-banner --verbose || findings=$((findings+1)) ;;
    working-tree)
      gitleaks detect --source . --redact --no-banner --verbose --no-git || findings=$((findings+1)) ;;
  esac
else
  note "gitleaks not installed — running grep fallback only"
  note "install: brew install gitleaks  (or:  https://github.com/gitleaks/gitleaks)"
fi

# ─────────────────────────────────────────────────────────────────
# Tier 2 — grep / ripgrep fallback for placeholder-style secrets.
# These rules catch the patterns gitleaks default ruleset misses:
# project-specific config keys with literal values.
# ─────────────────────────────────────────────────────────────────

# Pick the file list to scan based on mode.
case "$MODE" in
  history)
    # Cannot grep history line-by-line cheaply; rely on gitleaks for that.
    note "history mode: skipping grep tier (gitleaks covers history)"
    files=()
    ;;
  staged)
    mapfile -t files < <(git diff --cached --name-only --diff-filter=ACMR)
    ;;
  working-tree)
    mapfile -t files < <(git ls-files --cached --others --exclude-standard)
    ;;
esac

# Filter to text-ish files; skip vendored/generated.
keep=()
for f in "${files[@]:-}"; do
  [[ -z "$f" ]] && continue
  [[ ! -f "$f" ]] && continue
  case "$f" in
    *node_modules/*|*target/*|*dist/*|*build/*) continue ;;
    *.lock|*.png|*.jpg|*.jpeg|*.gif|*.ico|*.pdf|*.woff*|*.ttf|*.eot) continue ;;
    *generated-sources/*) continue ;;
  esac
  # Skip binaries.
  if file -b --mime "$f" 2>/dev/null | grep -q "charset=binary"; then continue; fi
  keep+=("$f")
done

scan_pattern() {
  local label="$1" pattern="$2"
  [[ ${#keep[@]} -eq 0 ]] && return 0
  local hits
  hits="$(grep -nIE "$pattern" "${keep[@]}" 2>/dev/null || true)"
  if [[ -n "$hits" ]]; then
    while IFS= read -r line; do
      # Redact the matched value: keep file:line:KEY= and replace value with ***.
      redacted="$(echo "$line" | sed -E 's/(=|: ?|"|'\'')[A-Za-z0-9_./+:@!-]{4,}/\1***/g')"
      report "[$label] $redacted"
    done <<< "$hits"
  fi
}

# 1. Project-specific: any *.key / *.secret / *.password / *.token assignment
#    with a non-empty literal that isn't ${...} env interpolation.
scan_pattern "project-key" \
  '^[[:space:]]*[A-Za-z0-9_.-]+(\.|_)?(key|secret|password|token|api[_-]?key)[[:space:]]*[:=][[:space:]]*[^$#[:space:]"][^[:space:]#]*'

# 2. Common high-entropy provider tokens (gitleaks usually catches these,
#    but kept here for the gitleaks-not-installed case).
scan_pattern "github-pat"   'gh[pous]_[A-Za-z0-9]{36,}'
scan_pattern "slack-bot"    'xox[baprs]-[A-Za-z0-9-]{10,}'
scan_pattern "stripe-live"  'sk_live_[A-Za-z0-9]{16,}'
scan_pattern "aws-access"   'AKIA[0-9A-Z]{16}'
scan_pattern "google-api"   'AIza[0-9A-Za-z_-]{35}'
scan_pattern "private-key"  '-----BEGIN (RSA|EC|OPENSSH|DSA|PGP|ENCRYPTED) PRIVATE KEY-----'

# 3. Bearer / Authorization header with a non-trivial value.
scan_pattern "bearer-hdr"   '[Aa]uthorization[[:space:]]*[:=][[:space:]]*"?[Bb]earer[[:space:]]+[A-Za-z0-9._-]{10,}'

# 4. JDBC URL with embedded password (postgres://user:pass@host).
scan_pattern "jdbc-pwd"     '(jdbc:[a-z]+://|postgresql://|mongodb://)[^[:space:]"]+:[^@[:space:]"]+@'

# 5. .env-style assignments with quoted multi-char value.
scan_pattern "dotenv-quote" '^[[:space:]]*[A-Z][A-Z0-9_]{2,}[[:space:]]*=[[:space:]]*"[^"]{8,}"'

# 6. Allowlist: noisy known-safe patterns that must NOT trigger.
#    Re-scan and subtract.  Implemented as a soft-warn for review.
allowlist_re='(\.example|EXAMPLE|placeholder|change.?me|<.+>|\$\{)'
if [[ ${#keep[@]} -gt 0 ]]; then
  if grep -nIE "$allowlist_re" "${keep[@]}" 2>/dev/null \
     | grep -iE '(secret|password|token|api[_-]?key)' >/dev/null; then
    note "some matches contain example/placeholder markers — review the list above and ignore those"
  fi
fi

# ─────────────────────────────────────────────────────────────────
# Result.
# ─────────────────────────────────────────────────────────────────
echo
if (( findings > 0 )); then
  printf "%s%d findings.%s  Refusing to commit.\n" "$RED" "$findings" "$RESET"
  printf "  • If a finding is a known false positive, add it to .gitleaks.toml allowlist.\n"
  printf "  • Run with --all to scan history, or --pre-commit to scan only staged files.\n"
  exit 1
fi
ok "no secrets detected"
