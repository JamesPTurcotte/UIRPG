#!/bin/bash
# Static snapshot for GitHub Pages. Pages serves the docs folder on master.
set -e
root="$(cd "$(dirname "$0")" && pwd)"
cd "$root"
rm -rf dist
mkdir -p dist/src/game/story dist/src/ui
cp index.html privacy.html dist/
cp google*.html dist/ 2>/dev/null || true
if [ -f docs/google44df7cdfcc742ddd.html ]; then
  cp docs/google44df7cdfcc742ddd.html dist/
fi
cp src/styles.css dist/src/
cp src/config.js src/main.js dist/src/
cp src/game/core.js src/game/utils.js src/game/events.js src/game/state.js dist/src/game/
cp src/game/story/*.js dist/src/game/story/
cp src/ui/*.js dist/src/ui/
touch dist/.nojekyll
rm -rf docs
cp -r dist docs
