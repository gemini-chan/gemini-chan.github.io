#!/usr/bin/env bash
set -e

# Collect all dependencies and devDependencies from package.json using node
PKGS=$(node -e "const p=require('./package.json'); const names=[...Object.keys(p.dependencies||{}),...Object.keys(p.devDependencies||{})]; console.log(names.join('\n'));")

for name in $PKGS; do
  echo "=== $name ==="
  echo -n "latest: "; npm view "$name" version || true
  echo -n "installed: "; node -e "const p=require('./package.json'); const v=(p.dependencies||{})['$name'] || (p.devDependencies||{})['$name'] || 'n/a'; console.log(v)" || true
  echo -n "recent versions: "; npm view "$name" versions --json | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{try{const v=JSON.parse(d); if(Array.isArray(v)){const recent=v.slice(-10); console.log(recent.join(', '));} else { console.log(d);} }catch(e){ console.log(d); }})" || true
  echo
done
