const MW_HOST = 'api.musclewiki.com';

/**
 * Resolve uma URL de vídeo para o formato correto.
 * - Se for URL absoluta da MuscleWiki (api.musclewiki.com), converte para proxy local
 * - Se for URL relativa do proxy (/api/v1/musclewiki/stream/...), mantém como está
 * - Se for YouTube/Vimeo/outra, retorna como está
 */
export function resolveVideoUrl(url?: string | null): string {
  if (!url) return '';
  
  // Já é URL relativa do proxy — converte para URL absoluta para evitar conflito com o rewrite do Next.js
  // (o rewrite /api/:path* adiciona /v1/ e duplicaria o path)
  if (url.startsWith('/api/v1/musclewiki/')) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
    return `${apiBase}${url}`;
  }
  
  // URL absoluta da MuscleWiki — converte para proxy local
  if (url.includes(MW_HOST)) {
    try {
      const u = new URL(url);
      const match = u.pathname.match(/\/stream\/videos\/(branded|unbranded)\/([^/]+)$/);
      if (!match) return url;
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
      return `${apiBase}/api/v1/musclewiki/stream/${match[1]}/${match[2]}`;
    } catch {
      return url;
    }
  }
  
  return url;
}

/**
 * Resolve uma URL de thumbnail/imagem para o formato correto.
 * - Se for URL absoluta da MuscleWiki, converte para proxy local
 * - Se for URL relativa do proxy, mantém como está
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  
  // Já é URL relativa do nosso proxy
  if (url.startsWith('/api/v1/musclewiki/')) return url;
  
  // URL absoluta da MuscleWiki
  if (url.includes(MW_HOST)) {
    try {
      const u = new URL(url);
      const match = u.pathname.match(/\/stream\/images\/og_images\/([^/]+)$/);
      if (!match) return url;
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
      return `${apiBase}/api/v1/musclewiki/image/og/${match[1]}`;
    } catch {
      return url;
    }
  }
  
  return url;
}
