import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('workout-suggestion/:studentId')
  @ApiOperation({ summary: 'Sugestão de treino por IA' })
  suggestWorkout(@Param('studentId') studentId: string) {
    return this.aiService.suggestWorkout(studentId);
  }

  @Get('diet-suggestion/:studentId')
  @ApiOperation({ summary: 'Sugestão de dieta por IA' })
  suggestDiet(@Param('studentId') studentId: string) {
    return this.aiService.suggestDiet(studentId);
  }

  @Get('motivation/:studentId')
  @ApiOperation({ summary: 'Mensagem motivacional personalizada' })
  getMotivation(@Param('studentId') studentId: string) {
    return this.aiService.getMotivationalMessage(studentId);
  }

  @Post('exercise-alternative')
  @ApiOperation({ summary: 'Sugerir exercício alternativo' })
  suggestAlternative(@Body() body: { exerciseName: string; reason: string }) {
    return this.aiService.suggestExerciseAlternative(body.exerciseName, body.reason);
  }

  @Post('assistant')
  @ApiOperation({ summary: 'Chat com assistente fitness IA' })
  chat(
    @CurrentUser('id') userId: string,
    @Body() body: { message: string; history?: any[] },
  ) {
    return this.aiService.chatWithAssistant(userId, body.message, body.history);
  }

  @Post('analyze-photo')
  @ApiOperation({ summary: 'Análise de foto de progresso por IA' })
  analyzePhoto(@Body() body: { photoUrl: string }) {
    return this.aiService.analyzeProgressPhoto(body.photoUrl);
  }
}
