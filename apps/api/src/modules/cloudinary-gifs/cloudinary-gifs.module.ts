import { Module } from '@nestjs/common';
import { CloudinaryGifsController } from './cloudinary-gifs.controller';
import { CloudinaryGifsService } from './cloudinary-gifs.service';

@Module({
  controllers: [CloudinaryGifsController],
  providers: [CloudinaryGifsService],
  exports: [CloudinaryGifsService],
})
export class CloudinaryGifsModule {}