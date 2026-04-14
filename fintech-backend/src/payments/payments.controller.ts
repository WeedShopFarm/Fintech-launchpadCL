import { Controller, Post, Get, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateOneTimePaymentDto, CreateRecurringPaymentDto, PaymentResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('one-time')
  @HttpCode(HttpStatus.CREATED)
  async createOneTime(@Body() createPaymentDto: CreateOneTimePaymentDto, @Request() req: any): Promise<PaymentResponseDto> {
    const businessId = req.user.id;
    return this.paymentsService.createOneTime(businessId, createPaymentDto);
  }

  @Post('recurring')
  @HttpCode(HttpStatus.CREATED)
  async createRecurring(@Body() createPaymentDto: CreateRecurringPaymentDto, @Request() req: any): Promise<any> {
    const businessId = req.user.id;
    return this.paymentsService.createRecurring(businessId, createPaymentDto);
  }

  @Get()
  async findAll(@Request() req: any): Promise<PaymentResponseDto[]> {
    const businessId = req.user.id;
    return this.paymentsService.findAll(businessId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any): Promise<PaymentResponseDto> {
    const businessId = req.user.id;
    return this.paymentsService.findOne(id, businessId);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retry(@Param('id') id: string, @Request() req: any): Promise<PaymentResponseDto> {
    const businessId = req.user.id;
    return this.paymentsService.retry(id, businessId);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  async refund(@Param('id') id: string, @Body() body: { amount?: number }, @Request() req: any): Promise<PaymentResponseDto> {
    const businessId = req.user.id;
    return this.paymentsService.refund(id, businessId, body.amount);
  }
}
