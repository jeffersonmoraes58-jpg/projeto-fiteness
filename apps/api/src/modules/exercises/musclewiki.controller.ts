import { Controller, Get, Param, Query, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';

const MW_API_BASE = process.env.MUSCLEWIKI_API_BASE ?? 'https://api.musclewiki.com';
const MW_API_KEY = process.env.MUSCLEWIKI_API_KEY;

@ApiTags('musclewiki')
@Controller('musclewiki')
export class MuscleWikiController {
  @Get('stream/:kind/:filename')
  @ApiOperation({ summary: 'Proxy de stream de vídeo do MuscleWiki (protege X-API-Key)' })
  async stream(
    @Param('kind') kind: 'branded' | 'unbranded',
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!MW_API_KEY) throw new HttpException('MuscleWiki API key not configured', HttpStatus.SERVICE_UNAVAILABLE);
    if (kind !== 'branded' && kind !== 'unbranded') throw new HttpException('Invalid kind', HttpStatus.BAD_REQUEST);
    if (!/^[A-Za-z0-9_\-.]+\.(mp4|webm)$/i.test(filename)) throw new HttpException('Invalid filename', HttpStatus.BAD_REQUEST);

    const upstream = await fetch(`${MW_API_BASE}/stream/videos/${kind}/${encodeURIComponent(filename)}`, {
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
    const reader = upstream.body.getReader();
    res.on('close', () => reader.cancel().catch(() => {}));
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  }
}
