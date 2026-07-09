import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface GifFolder {
  name: string;
  path: string;
  count: number;
  thumbnailUrl: string | null;
}

export interface GifFile {
  publicId: string;
  url: string;
  name: string;
  folder: string;
}

@Injectable()
export class CloudinaryGifsService {
  private readonly logger = new Logger(CloudinaryGifsService.name);
  private readonly rootFolder = '278 exercicios musculação';

  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  /** Lista as subpastas dentro da pasta raiz (grupos musculares) */
  async listFolders(): Promise<GifFolder[]> {
    try {
      const result = await cloudinary.api.sub_folders(this.rootFolder);
      const folders = result.folders || [];

      // Para cada pasta, busca o primeiro recurso como thumbnail
      const enriched: GifFolder[] = [];
      for (const f of folders) {
        const prefix = `${this.rootFolder}/${f.name}/`;
        try {
          const resources = await cloudinary.api.resources({
            type: 'upload',
            prefix,
            max_results: 1,
          });
          enriched.push({
            name: f.name,
            path: f.path,
            count: 0, // será atualizado abaixo
            thumbnailUrl: resources.resources?.[0]?.secure_url ?? null,
          });
        } catch {
          enriched.push({ name: f.name, path: f.path, count: 0, thumbnailUrl: null });
        }
      }

      // Conta recursos em cada pasta (em paralelo)
      await Promise.all(
        enriched.map(async (folder) => {
          try {
            const prefix = `${this.rootFolder}/${folder.name}/`;
            const resources = await cloudinary.api.resources({
              type: 'upload',
              prefix,
              max_results: 500,
            });
            folder.count = resources.resources?.length ?? 0;
          } catch {
            folder.count = 0;
          }
        }),
      );

      return enriched.filter((f) => f.count > 0);
    } catch (err: any) {
      this.logger.error(`Erro ao listar pastas do Cloudinary: ${err.message}`);
      return [];
    }
  }

  /** Lista os arquivos GIF dentro de uma subpasta */
  async listFiles(folder: string): Promise<GifFile[]> {
    try {
      const prefix = `${this.rootFolder}/${folder}/`;
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix,
        max_results: 500,
        context: true,
      });

      const resources = result.resources || [];
      return resources.map((r: any) => {
        // Extrai nome legível do public_id (última parte do path, sem extensão)
        const filename = r.public_id.split('/').pop() || r.public_id;
        const name = filename
          .replace(/[-_]/g, ' ')
          .replace(/\.(gif|mp4|webm|png|jpg|jpeg)$/i, '')
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
          .trim();

        return {
          publicId: r.public_id,
          url: r.secure_url,
          name,
          folder: folder,
        };
      });
    } catch (err: any) {
      this.logger.error(`Erro ao listar arquivos da pasta ${folder}: ${err.message}`);
      return [];
    }
  }
}