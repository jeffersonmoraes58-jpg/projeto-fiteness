declare module 'ytdl-core' {
  import { Readable } from 'stream';

  interface VideoDetails {
    title: string;
    videoId: string;
    lengthSeconds: string;
    thumbnails: { url: string; width: number; height: number }[];
    author: { name: string; channel_url: string };
  }

  interface VideoInfo {
    videoDetails: VideoDetails;
    formats: any[];
  }

  interface DownloadOptions {
    quality?: string | string[];
    filter?: string | ((format: any) => boolean);
    format?: string;
  }

  function getInfo(url: string): Promise<VideoInfo>;
  function getURLVideoID(url: string): string;
  function validateURL(url: string): boolean;

  function exec(url: string, options?: DownloadOptions): Readable;

  export { getInfo, getURLVideoID, validateURL, exec };
  export type { VideoInfo, VideoDetails, DownloadOptions };
}
