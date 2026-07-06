import { Controller, Get, Param, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const MW_API_BASE = process.env.MUSCLEWIKI_API_BASE ?? 'https://api.musclewiki.com';
const MW_API_KEY = process.env.MUSCLEWIKI_API_KEY;
// Usar /data/musclewiki-cache para cache persistente (montado como volume no docker-compose)
// Fallback para /tmp se /data não estiver disponível
const CACHE_DIR = (() => {
  try {
    const dir = '/data/musclewiki-cache';
    if (!fs.existsSync('/data')) {
      const tmp = '/tmp/musclewiki-cache';
      if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
      return tmp;
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    const tmp = '/tmp/musclewiki-cache';
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
    return tmp;
  }
})();

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCachePath(filename: string): string {
  return path.join(CACHE_DIR, filename);
}

/**
 * Tenta servir do cache primeiro.
 * Suporta Range Requests (HTTP 206 Partial Content) para streaming de vídeo.
 * Retorna true se serviu do cache, false se não encontrou.
 */
function tryServeFromCache(req: Request, res: Response, cacheKey: string): boolean {
  const cachePath = getCachePath(cacheKey);
  if (fs.existsSync(cachePath)) {
    const stat = fs.statSync(cachePath);
    // Vídeos corrompidos/parciais (< 50KB) são descartados para re-download
    if (cacheKey.startsWith('video_') && stat.size < 50 * 1024) {
      try { fs.unlinkSync(cachePath); } catch { /* ignore */ }
      return false;
    }
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    const ext = Object.keys(mimeTypes).find((e) => cacheKey.endsWith(e));
    const contentType = ext ? mimeTypes[ext] : 'application/octet-stream';

    // Handle Range Request (for video streaming)
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? Math.min(parseInt(parts[1], 10), stat.size - 1) : stat.size - 1;

      if (isNaN(start) || start >= stat.size) {
        res.writeHead(416, { 'content-range': `bytes */${stat.size}` });
        res.end();
        return true;
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'content-type': contentType,
        'content-length': chunkSize,
        'content-range': `bytes ${start}-${end}/${stat.size}`,
        'accept-ranges': 'bytes',
        'cache-control': `public, max-age=${maxAge}`,
      });
      fs.createReadStream(cachePath, { start, end }).pipe(res);
      return true;
    }

    // Full content request
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': stat.size,
      'cache-control': `public, max-age=${maxAge}`,
      'accept-ranges': 'bytes',
    });
    fs.createReadStream(cachePath).pipe(res);
    return true;
  }
  return false;
}

async function pipeUpstream(req: Request, res: Response, upstreamUrl: string, cacheKey?: string) {
  if (!MW_API_KEY) throw new HttpException('MuscleWiki API key not configured', HttpStatus.SERVICE_UNAVAILABLE);

  // Try cache first — cache always contains the full file, so Range requests are handled correctly
  if (cacheKey) {
    ensureCacheDir();
    if (tryServeFromCache(req, res, cacheKey)) return;
  }

  // Fetch the FULL file from upstream (never forward Range header).
  // This ensures the cache always contains the complete file.
  // Subsequent requests are served from the cache with proper Range support.
  const upstream = await fetch(upstreamUrl, {
    headers: { 'X-API-Key': MW_API_KEY },
  });

  if (!upstream.ok) {
    res.status(upstream.status).send(await upstream.text());
    return;
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const maxAge = 7 * 24 * 60 * 60; // 7 days

  // Read full body
  const reader = upstream.body.getReader();
  const chunks: Buffer[] = [];
  let streamError = false;

  res.on('close', () => {
    reader.cancel().catch(() => {});
  });

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } catch {
    streamError = true;
  }

  if (streamError) return;

  const fullBody = Buffer.concat(chunks);
  const totalSize = fullBody.length;

  // Save full file to cache (synchronously — response not yet sent)
  if (cacheKey && totalSize > 0) {
    try {
      ensureCacheDir();
      fs.writeFileSync(getCachePath(cacheKey), fullBody);
    } catch {
      // Silently fail cache write
    }
  }

  // Serve the file with Range support
  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? Math.min(parseInt(parts[1], 10), totalSize - 1) : totalSize - 1;

    if (isNaN(start) || start >= totalSize) {
      res.writeHead(416, { 'content-range': `bytes */${totalSize}` });
      res.end();
      return;
    }

    const slice = fullBody.slice(start, end + 1);
    res.writeHead(206, {
      'content-type': contentType,
      'content-length': slice.length,
      'content-range': `bytes ${start}-${end}/${totalSize}`,
      'accept-ranges': 'bytes',
      'cache-control': `public, max-age=${maxAge}`,
    });
    res.end(slice);
  } else {
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': totalSize,
      'accept-ranges': 'bytes',
      'cache-control': `public, max-age=${maxAge}`,
    });
    res.end(fullBody);
  }
}

@ApiTags('musclewiki')
@Controller('musclewiki')
export class MuscleWikiController {
  @Get('stream/:kind/:filename')
  @ApiOperation({ summary: 'Proxy de stream de vídeo do MuscleWiki (com cache em disco após 1ª requisição)' })
  async stream(
    @Param('kind') kind: 'branded' | 'unbranded',
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (kind !== 'branded' && kind !== 'unbranded') throw new HttpException('Invalid kind', HttpStatus.BAD_REQUEST);
    if (!/^[A-Za-z0-9_\-.]+\.(mp4|webm)$/i.test(filename)) throw new HttpException('Invalid filename', HttpStatus.BAD_REQUEST);
    // Vídeos também são cacheados em disco — só consome crédito do MuscleWiki na primeira requisição
    const cacheKey = `video_${kind}_${filename}`;
    await pipeUpstream(req, res, `${MW_API_BASE}/stream/videos/${kind}/${encodeURIComponent(filename)}`, cacheKey);
  }

  @Get('image/og/:filename')
  @ApiOperation({ summary: 'Proxy de imagem og do MuscleWiki (com cache em disco)' })
  async image(
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!/^[A-Za-z0-9_\-.]+\.(jpg|jpeg|png|webp)$/i.test(filename)) throw new HttpException('Invalid filename', HttpStatus.BAD_REQUEST);
    // Imagens são cacheadas em disco — só consome crédito do MuscleWiki na primeira requisição
    await pipeUpstream(req, res, `${MW_API_BASE}/stream/images/og_images/${encodeURIComponent(filename)}`, `og_${filename}`);
  }
}
