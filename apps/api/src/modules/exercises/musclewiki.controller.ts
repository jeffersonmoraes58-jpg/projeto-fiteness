import { Controller, Get, Param, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const MW_API_BASE = process.env.MUSCLEWIKI_API_BASE ?? 'https://api.musclewiki.com';
const MW_API_KEY = process.env.MUSCLEWIKI_API_KEY;
const CACHE_DIR = path.resolve('/tmp/musclewiki-cache');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCachePath(filename: string): string {
  return path.join(CACHE_DIR, filename);
}

/**
 * Tenta servir do cache primeiro.
 * Retorna true se serviu do cache, false se não encontrou.
 */
function tryServeFromCache(res: Response, cacheKey: string): boolean {
  const cachePath = getCachePath(cacheKey);
  if (fs.existsSync(cachePath)) {
    const stat = fs.statSync(cachePath);
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    res.setHeader('cache-control', `public, max-age=${maxAge}`);
    res.setHeader('content-type', cacheKey.endsWith('.webp') ? 'image/webp' : cacheKey.endsWith('.png') ? 'image/png' : cacheKey.endsWith('.jpg') || cacheKey.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream');
    res.setHeader('content-length', stat.size);
    res.sendFile(cachePath);
    return true;
  }
  return false;
}

async function pipeUpstream(req: Request, res: Response, upstreamUrl: string, cacheKey?: string) {
  if (!MW_API_KEY) throw new HttpException('MuscleWiki API key not configured', HttpStatus.SERVICE_UNAVAILABLE);

  // Try cache first
  if (cacheKey) {
    ensureCacheDir();
    if (tryServeFromCache(res, cacheKey)) return;
  }

  const upstream = await fetch(upstreamUrl, {
    headers: {
      'X-API-Key': MW_API_KEY,
      ...(req.headers.range ? { Range: String(req.headers.range) } : {}),
    },
  });

  if (!upstream.ok && upstream.status !== 206) {
    res.status(upstream.status).send(await upstream.text());
    return;
  }

  res.status(upstream.status);
  const passthrough = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag'];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  if (!upstream.headers.get('cache-control')) res.setHeader('cache-control', 'public, max-age=86400');

  if (!upstream.body) {
    res.end();
    return;
  }

  // Buffer the response to cache it and serve
  const chunks: Buffer[] = [];
  const reader = upstream.body.getReader();
  res.on('close', () => reader.cancel().catch(() => {}));
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      const buf = Buffer.from(value);
      chunks.push(buf);
      res.write(buf);
    }
  }
  res.end();

  // Save to cache after serving (for images AND videos)
  if (cacheKey && chunks.length > 0) {
    try {
      ensureCacheDir();
      fs.writeFileSync(getCachePath(cacheKey), Buffer.concat(chunks));
    } catch (e) {
      // Silently fail if cache write fails
    }
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
