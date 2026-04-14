import { Controller, Post, Get, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { MandatesService } from './mandates.service';
import { CreateMandateDto, MandateResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/mandates')
@UseGuards(JwtAuthGuard)
export class MandatesController {
  constructor(private mandatesService: MandatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMandateDto: CreateMandateDto, @Request() req: any): Promise<MandateResponseDto> {
    // TODO: Get businessId from user context
    const businessId = req.user.id;
    return this.mandatesService.create(businessId, createMandateDto);
  }

  @Get()
  async findAll(@Request() req: any): Promise<MandateResponseDto[]> {
    const businessId = req.user.id;
    return this.mandatesService.findAll(businessId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any): Promise<MandateResponseDto> {
    const businessId = req.user.id;
    return this.mandatesService.findOne(id, businessId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @Request() req: any): Promise<MandateResponseDto> {
    const businessId = req.user.id;
    return this.mandatesService.cancel(id, businessId);
  }
}
