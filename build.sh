#!/bin/bash
rm -rf dist
mkdir -p dist/src/game/story dist/src/save dist/src/ui dist/server
cp index.html dist/
cp privacy.html dist/
cp google*.html dist/ 2>/dev/null; true
cp src/styles.css dist/src/
cp src/game/*.js dist/src/game/
cp src/game/story/*.js dist/src/game/story/
cp server/*.js server/*.json dist/server/
cp src/save/*.js dist/src/save/
cp src/ui/*.js dist/src/ui/
cp src/config.js dist/src/
cp src/main.js dist/src/
rm -rf docs
cp -r dist docs
