#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_root"

load_env_file() {
  local env_file="$1"
  local line line_number=0 key raw_value value

  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1))
    line="${line%$'\r'}"

    [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && continue

    if [[ ! "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]]; then
      printf 'Invalid .env entry at line %s. Expected KEY=value.\n' "$line_number" >&2
      return 1
    fi

    key="${BASH_REMATCH[2]}"
    raw_value="${BASH_REMATCH[3]}"
    value="${raw_value#"${raw_value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"

    if [[ ${#value} -ge 2 ]] && {
      [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]] ||
      [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]];
    }; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == *" #"* ]]; then
      value="${value%% #*}"
    fi

    printf -v "$key" '%s' "$value"
    export "$key"
  done < "$env_file"
}

require_environment_variable() {
  local variable_name="$1"
  if [[ -z "${!variable_name:-}" ]]; then
    printf 'Missing required environment variable: %s\n' "$variable_name" >&2
    exit 1
  fi
}

if [[ -f .env ]]; then
  printf 'Loading environment variables from .env\n'
  load_env_file .env
fi

# Preserve compatibility with existing Vercel projects while keeping new local
# configuration server-only.
SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_ANON_KEY:-}}"
export SUPABASE_URL SUPABASE_ANON_KEY

require_environment_variable SUPABASE_URL
require_environment_variable SUPABASE_ANON_KEY

vercel_binary="$project_root/node_modules/.bin/vercel"
if [[ ! -x "$vercel_binary" ]]; then
  printf 'Vercel CLI is not installed. Run npm install first.\n' >&2
  exit 1
fi

printf 'Starting Schedula at http://localhost:3000\n'
exec "$vercel_binary" dev --listen 3000
