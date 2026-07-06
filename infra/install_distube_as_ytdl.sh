#!/bin/sh
cd /tmp
npm pack @distube/ytdl-core@4.14.4 sax miniget m3u8stream 2>/dev/null

tar xzf distube-ytdl-core-4.14.4.tgz
mkdir -p /app/node_modules/ytdl-core
cp -r package/* /app/node_modules/ytdl-core/
rm -rf package distube-ytdl-core-4.14.4.tgz

for f in sax-1.6.0.tgz miniget-4.2.3.tgz m3u8stream-0.8.6.tgz; do
  tar xzf "$f"
  pkgname=$(cat package/package.json | grep '"name"' | head -1 | cut -d'"' -f4)
  mkdir -p /app/node_modules/$pkgname
  cp -r package/* /app/node_modules/$pkgname/
  rm -rf package "$f"
done

echo PRONTO
