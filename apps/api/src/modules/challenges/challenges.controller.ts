import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChallengesService } from './challenges.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('challenges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private service: ChallengesService) {}

  // ── TRAINER ──────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Criar desafio (TRAINER)' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createChallenge(user.id, body);
  }

  @Get('trainer/mine')
  @ApiOperation({ summary: 'Listar desafios do trainer' })
  getTrainerChallenges(@CurrentUser() user: any) {
    return this.service.getTrainerChallenges(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar desafio (TRAINER)' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.updateChallenge(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir desafio (TRAINER)' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteChallenge(user.id, id);
  }

  // ── STUDENT ──────────────────────────────────────────────

  @Get('available')
  @ApiOperation({ summary: 'Desafios disponíveis para o aluno' })
  findAvailable(@CurrentUser() user: any) {
    return this.service.findAvailable(user.id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Desafios em andamento do aluno' })
  findActive(@CurrentUser() user: any) {
    return this.service.findActive(user.id);
  }

  @Get('completed')
  @ApiOperation({ summary: 'Desafios concluídos do aluno' })
  findCompleted(@CurrentUser() user: any) {
    return this.service.findCompleted(user.id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Entrar em desafio gratuito' })
  join(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.join(user.id, id);
  }

  @Post(':id/purchase/pix')
  @ApiOperation({ summary: 'Comprar desafio via Pix' })
  purchasePix(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.purchasePix(user.id, id);
  }

  @Post(':id/purchase/checkout')
  @ApiOperation({ summary: 'Comprar desafio via Checkout Pro' })
  purchaseCheckout(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.purchaseCheckout(user.id, id);
  }

  @Post(':id/progress')
  @ApiOperation({ summary: 'Atualizar progresso no desafio' })
  updateProgress(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { progress: number }) {
    return this.service.updateProgress(user.id, id, body.progress);
  }

  // ── TRAINER — LESSONS ────────────────────────────────────

  @Post(':id/lessons')
  @ApiOperation({ summary: 'Criar aula no desafio (TRAINER)' })
  createLesson(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.createLesson(user.id, id, body);
  }

  @Get(':id/lessons')
  @ApiOperation({ summary: 'Listar aulas do desafio' })
  getLessons(@Param('id') id: string) {
    return this.service.getLessons(id);
  }

  @Patch('lessons/:lessonId')
  @ApiOperation({ summary: 'Editar aula (TRAINER)' })
  updateLesson(@CurrentUser() user: any, @Param('lessonId') lessonId: string, @Body() body: any) {
    return this.service.updateLesson(user.id, lessonId, body);
  }

  @Delete('lessons/:lessonId')
  @ApiOperation({ summary: 'Excluir aula (TRAINER)' })
  deleteLesson(@CurrentUser() user: any, @Param('lessonId') lessonId: string) {
    return this.service.deleteLesson(user.id, lessonId);
  }

  @Post(':id/lessons/reorder')
  @ApiOperation({ summary: 'Reordenar aulas do desafio (TRAINER)' })
  reorderLessons(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { orders: { id: string; order: number }[] }) {
    return this.service.reorderLessons(user.id, id, body.orders);
  }

  @Post('lessons/:lessonId/attachments')
  @ApiOperation({ summary: 'Adicionar anexo à aula (TRAINER)' })
  addAttachment(@CurrentUser() user: any, @Param('lessonId') lessonId: string, @Body() body: any) {
    return this.service.addAttachment(user.id, lessonId, body);
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: 'Excluir anexo da aula (TRAINER)' })
  deleteAttachment(@CurrentUser() user: any, @Param('attachmentId') attachmentId: string) {
    return this.service.deleteAttachment(user.id, attachmentId);
  }

  // ── STUDENT — CONTENT ────────────────────────────────────

  @Get(':id/content')
  @ApiOperation({ summary: 'Obter conteúdo do desafio (STUDENT)' })
  getChallengeContent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getChallengeContent(user.id, id);
  }

  @Post('lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Atualizar progresso na aula (STUDENT)' })
  updateLessonProgress(@CurrentUser() user: any, @Param('lessonId') lessonId: string, @Body() body: { progress: number }) {
    return this.service.updateLessonProgress(user.id, lessonId, body.progress);
  }
}
