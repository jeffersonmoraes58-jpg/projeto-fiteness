#!/bin/sh
cd /tmp
npm pack @distube/ytdl-core@4.14.4 sax miniget m3u8stream 2>&1
for f in *.tgz; do
  tar xzf "$f"
  pkgname=$(cat package/package.json | grep '"name"' | head -1 | cut -d'"' -f4)
  mkdir -p /app/node_modules/$pkgname
  cp -r package/* /app/node_modules/$pkgname/
  rm -rf package
done
echo PRONTO
