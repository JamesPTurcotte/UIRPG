#!/bin/bash
url="https://jamespturcotte.github.io/UIRPG/"
if command -v open >/dev/null 2>&1; then
  open "$url"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$url"
else
  echo "Open $url"
  read -r -p "Press return to close."
fi
