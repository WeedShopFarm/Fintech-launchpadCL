import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto, VerifyBankAccountDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/bank-accounts')
@UseGuards(JwtAuthGuard)
export class BankAccountsController {
  constructor(private bankAccountsService: BankAccountsService) {}

  @Post()
  async create(@Body() createBankAccountDto: CreateBankAccountDto, @Request() req: any) {
    // TODO: Get customerId from request user context
    const customerId = req.user.id;
    return this.bankAccountsService.create(customerId, createBankAccountDto);
  }

  @Get()
  async findAll(@Request() req: any) {
    const customerId = req.user.id;
    return this.bankAccountsService.findAll(customerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const customerId = req.user.id;
    return this.bankAccountsService.findOne(id, customerId);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Param('id') id: string, @Body() verifyDto: VerifyBankAccountDto, @Request() req: any) {
    const customerId = req.user.id;
    return this.bankAccountsService.verify(id, customerId, verifyDto);
  }

  @Get(':id/balance')
  async getBalance(@Param('id') id: string, @Request() req: any) {
    const customerId = req.user.id;
    return this.bankAccountsService.getBalance(id, customerId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any) {
    const customerId = req.user.id;
    await this.bankAccountsService.remove(id, customerId);
  }
}
