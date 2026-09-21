#!/bin/zsh
set -e
cd -- "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  minttrace_node_bin="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [[ -x "$minttrace_node_bin/node" ]]; then
    export PATH="$minttrace_node_bin:/opt/homebrew/bin:$PATH"
  else
    echo 'MintTrace requires Node.js 22.12 or newer. Install Node.js, then open this file again.'
    read -r '?Press Enter to close.'
    exit 1
  fi
fi
if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  chmod 600 .env.local
  echo 'Add your model API key to .env.local to run investigations. The walkthrough works without a key.'
fi
if [[ ! -d node_modules ]]; then npm install; fi
npm run build
echo 'Open http://127.0.0.1:4173 — keep this terminal open while using MintTrace.'
npm start
