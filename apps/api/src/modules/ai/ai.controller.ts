import { Controller, Get, Post, Body, Param, UseGuards, InternalServerErrorException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { PlanFeatureGuard } from '../subscriptions/plan-feature.guard';
import { RequireFeature } from '../subscriptions/require-feature.decorator';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlanFeatureGuard)
@RequireFeature('ai')
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

  @Post('generate-workout')
  @ApiOperation({ summary: 'Gerar treino completo com IA a partir de descrição do trainer' })
  generateWorkout(
    @CurrentUser('id') userId: string,
    @Body() body: { description: string },
  ) {
    return this.aiService.generateWorkout(body.description, userId);
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
    @Body() body: { message: string; history?: any[]; context?: string },
  ) {
    return this.aiService.chatWithAssistant(userId, body.message, body.history, body.context);
  }

  @Post('nutrition-tool')
  @ApiOperation({ summary: 'Ferramentas de IA para nutricionista (plano, cardápio, substituições)' })
  nutritionTool(
    @CurrentUser('id') userId: string,
    @Body() body: { tool: string; patientId?: string; params?: any },
  ) {
    return this.aiService.nutritionTool(userId, body.tool, body.patientId, body.params);
  }

  @Post('analyze-photo')
  @ApiOperation({ summary: 'Análise de foto de progresso por IA' })
  analyzePhoto(@Body() body: { photoUrl: string }) {
    return this.aiService.analyzeProgressPhoto(body.photoUrl);
  }

  @Post('analyze-student/:studentId')
  @ApiOperation({ summary: 'Análise completa de aluno por IA' })
  async analyzeStudent(
    @Param('studentId') studentId: string,
    @CurrentUser('id') userId: string,
  ) {
    try {
      return await this.aiService.analyzeStudent(studentId, userId);
    } catch (err) {
      const msg = (err as Error).message || 'Erro interno na análise';
      throw new InternalServerErrorException(msg);
    }
  }

  @Post('apply-changes')
  @ApiOperation({ summary: 'Aplicar alterações de treino propostas pela IA' })
  applyChanges(
    @Body() body: { planId: string; exercises: any[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.applyStudentChanges(body.planId, body.exercises, userId);
  }

  @Post('upload-pdf')
  @ApiOperation({ summary: 'Upload de PDF com treinos para IA analisar e criar exercícios' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        return cb(new BadRequestException('Apenas arquivos PDF são aceitos'), false);
      }
      cb(null, true);
    },
  }))
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    return this.aiService.processPdfWorkout(file.buffer, file.originalname, userId);
  }
}