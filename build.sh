#!/bin/bash
rm -rf dist
mkdir -p dist/src/game dist/src/save dist/src/ui
cp index.html dist/
cp src/styles.css dist/src/
cp src/game/*.js dist/src/game/
cp src/save/*.js dist/src/save/
cp src/ui/*.js dist/src/ui/
cp src/main.js dist/src/
rm -rf docs
cp -r dist docs
