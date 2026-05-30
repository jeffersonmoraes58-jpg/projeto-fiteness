import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private service: BillingService) {}

  // ── TRAINER ──────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('trainer/pricing')
  @ApiOperation({ summary: 'Obter preços configurados pelo trainer' })
  getTrainerPricing(@CurrentUser() user: any) {
    return this.service.getPricing(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('trainer/pricing')
  @ApiOperation({ summary: 'Configurar preços mensal/anual e token MP' })
  setTrainerPricing(
    @CurrentUser() user: any,
    @Body() body: { monthlyPrice?: number; annualPrice?: number; mpAccessToken?: string },
  ) {
    return this.service.setPricing(user.id, body.monthlyPrice, body.annualPrice, body.mpAccessToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('trainer/billings')
  @ApiOperation({ summary: 'Listar cobranças de todos os alunos' })
  getTrainerBillings(@CurrentUser() user: any) {
    return this.service.getTrainerBillings(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('trainer/students/:studentUserId/subscribe')
  @ApiOperation({ summary: 'Criar assinatura para um aluno' })
  createSubscription(
    @CurrentUser() user: any,
    @Param('studentUserId') studentUserId: string,
    @Body() body: { interval?: 'MONTHLY' | 'ANNUAL'; dueDate?: string },
  ) {
    return this.service.createSubscription(
      user.id,
      studentUserId,
      body.interval ?? 'MONTHLY',
      body.dueDate ? new Date(body.dueDate) : undefined,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('trainer/invoices/:id/mark-paid')
  @ApiOperation({ summary: 'Marcar fatura como paga manualmente' })
  markInvoicePaid(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.markInvoicePaid(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('trainer/invoices/:id')
  @ApiOperation({ summary: 'Editar fatura (vencimento, valor, descrição)' })
  updateInvoice(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { dueDate?: string; amount?: number; description?: string },
  ) {
    return this.service.updateInvoice(user.id, id, {
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      amount: body.amount,
      description: body.description,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('trainer/invoices/:id')
  @ApiOperation({ summary: 'Excluir fatura (apenas PENDING/OVERDUE)' })
  deleteInvoice(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteInvoice(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('trainer/billings/:id')
  @ApiOperation({ summary: 'Cancelar cobrança de um aluno' })
  cancelBilling(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.cancelBilling(user.id, id);
  }

  // ── STUDENT ──────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('student/status')
  @ApiOperation({ summary: 'Status de cobrança do aluno' })
  getStudentBilling(@CurrentUser() user: any) {
    return this.service.getStudentBilling(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('student/invoice/:id/pix')
  @ApiOperation({ summary: 'Gerar QR Code Pix para pagar fatura' })
  generatePix(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.generatePixPayment(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('student/invoice/:id/checkout')
  @ApiOperation({ summary: 'Gerar link Checkout Pro (cartão de crédito) para pagar fatura' })
  generateCheckout(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.generateCheckoutPro(user.id, id);
  }

  // ── WEBHOOK (público) ─────────────────────────────────────

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Mercado Pago' })
  handleWebhook(@Body() body: any, @Query() query: any) {
    return this.service.handleWebhook(body, query);
  }
}
