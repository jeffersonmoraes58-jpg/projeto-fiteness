import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'João' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '11999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['TRAINER', 'NUTRITIONIST', 'STUDIO_OWNER'], description: 'Perfil do profissional. STUDENT é o padrão.' })
  @IsOptional()
  @IsIn(['TRAINER', 'NUTRITIONIST', 'STUDIO_OWNER'], { message: 'role deve ser TRAINER, NUTRITIONIST ou STUDIO_OWNER' })
  role?: 'TRAINER' | 'NUTRITIONIST' | 'STUDIO_OWNER';

  @ApiPropertyOptional({ example: 'tenant-id-here' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ example: 'Studio FitPro' })
  @IsOptional()
  @IsString()
  studioName?: string;

  @ApiPropertyOptional({ description: 'Token de convite gerado pelo personal trainer' })
  @IsOptional()
  @IsString()
  inviteToken?: string;

  @ApiPropertyOptional({ example: 'pro', description: 'Plano escolhido na landing page: starter, pro, elite' })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: 'annual', description: 'Ciclo de cobrança: monthly ou annual' })
  @IsOptional()
  @IsString()
  cycle?: string;

  @ApiPropertyOptional({ example: 'https://fitlynutri.com.br/dashboard', description: 'URL de retorno após pagamento' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
