import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignWorkoutDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  division?: string;

  @ApiProperty({ example: [1, 3, 5] })
  @IsArray()
  @IsNumber({}, { each: true })
  dayOfWeek: number[];

  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
