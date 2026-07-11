import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminResetPasswordDto {
  @ApiProperty({ example: 'student@demo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Student@123' })
  @IsString()
  newPassword: string;

  @ApiProperty({ example: 'admin-secret-key' })
  @IsString()
  adminKey: string;
}