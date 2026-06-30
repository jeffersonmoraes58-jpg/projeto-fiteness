const MW_HOST = 'api.musclewiki.com';

export function resolveVideoUrl(url?: string | null): string {
  if (!url) return '';
  if (!url.includes(MW_HOST)) return url;
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
