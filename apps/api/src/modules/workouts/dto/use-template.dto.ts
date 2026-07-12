import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray } from 'class-validator';

export class UseTemplateDto {
  @ApiProperty({
    description: 'Nome do novo treino (opcional, usa o nome do template se não informado)',
    example: 'Treino A - Peito e Bíceps (adaptado)',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Duração em minutos (opcional, usa a duração do template)',
    example: 60,
  })
  @IsInt()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Nível do treino (1-5)',
    example: 3,
  })
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({
    description: 'Tags adicionais para o treino',
    example: ['adaptado', 'personalizado'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Descrição do treino',
  })
  @IsString()
  @IsOptional()
  description?: string;
}