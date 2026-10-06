#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node is not installed, or it is not on your PATH."
  read -r -p "Press return to close."
  exit 1
fi
npm run play
