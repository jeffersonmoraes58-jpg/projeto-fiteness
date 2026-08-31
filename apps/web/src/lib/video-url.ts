const MW_HOST = 'api.musclewiki.com';

/**
 * Aplica transformação do Cloudinary pra entregar o vídeo já otimizado pra streaming.
 * Vídeos "crus" (ex: .mov exportado direto do celular) costumam ter o moov atom
 * (metadados de reprodução) no fim do arquivo, obrigando o navegador a baixar boa
 * parte do arquivo antes de conseguir tocar — daí a demora perceptível no play.
 * Forçando f_mp4 (+ q_auto), o Cloudinary transcodifica (e cacheia) uma versão MP4
 * com faststart, bem mais rápida pra iniciar a reprodução.
 */
function optimizeCloudinaryVideo(url: string): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return url;
  if (url.includes('/video/upload/f_')) return url; // já tem transformação de formato aplicada
  return url
    .replace('/video/upload/', '/video/upload/f_mp4,q_auto/')
    .replace(/\.(mov|avi|mkv|wmv|flv)(\?.*)?$/i, '.mp4');
}

/**
 * Resolve uma URL de vídeo para o formato correto.
 * - Se for URL absoluta da MuscleWiki (api.musclewiki.com), converte para proxy local
 * - Se for URL relativa do proxy (/api/v1/musclewiki/stream/...), mantém como está
 * - Se for do Cloudinary, aplica otimização de streaming (ver optimizeCloudinaryVideo)
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

  if (url.includes('res.cloudinary.com')) {
    return optimizeCloudinaryVideo(url);
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
