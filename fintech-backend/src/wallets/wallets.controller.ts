import { Controller, Get, Post, Param, Body, UseGuards, Request, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreatePayoutDto, WalletBalanceDto, LedgerEntryDto, PayoutResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Get('balance')
  async getBalance(@Query('walletId') walletId: string): Promise<WalletBalanceDto> {
    return this.walletsService.getBalance(walletId);
  }

  @Get('transactions')
  async getTransactions(
    @Query('walletId') walletId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<LedgerEntryDto[]> {
    return this.walletsService.getTransactions(walletId, limit, offset);
  }

  @Post('payouts/crypto')
  @HttpCode(HttpStatus.CREATED)
  async createCryptoPayout(@Body() createPayoutDto: CreatePayoutDto, @Request() req: any): Promise<PayoutResponseDto> {
    const userId = req.user.id;
    return this.walletsService.createPayout(userId, {
      ...createPayoutDto,
      method: 'crypto',
    });
  }

  @Post('payouts/bank')
  @HttpCode(HttpStatus.CREATED)
  async createBankPayout(@Body() createPayoutDto: CreatePayoutDto, @Request() req: any): Promise<PayoutResponseDto> {
    const userId = req.user.id;
    return this.walletsService.createPayout(userId, {
      ...createPayoutDto,
      method: createPayoutDto.method === 'wise' ? 'wise' : 'stripe',
    });
  }

  @Get('payouts')
  async listPayouts(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Request() req: any,
  ): Promise<PayoutResponseDto[]> {
    const userId = req.user.id;
    return this.walletsService.listPayouts(userId, limit, offset);
  }

  @Get('payouts/:id')
  async findPayout(@Param('id') id: string, @Request() req: any): Promise<PayoutResponseDto> {
    const userId = req.user.id;
    return this.walletsService.findPayout(id, userId);
  }
}
