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
  function downloadFromInfo(info: VideoInfo, options?: DownloadOptions): Readable;

  interface YtdlFunction {
    (url: string, options?: DownloadOptions): Readable;
    getInfo: typeof getInfo;
    getURLVideoID: typeof getURLVideoID;
    validateURL: typeof validateURL;
    downloadFromInfo: typeof downloadFromInfo;
  }

  const ytdl: YtdlFunction;
  export = ytdl;
}
