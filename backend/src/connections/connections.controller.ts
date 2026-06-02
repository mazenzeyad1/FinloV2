import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ExchangeTokenDto } from './dto/connect.dto';

@ApiTags('connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private service: ConnectionsService) {}

  @Post('link-token')
  @ApiOperation({ summary: 'Create a Plaid link token' })
  createLinkToken(@Request() req: any) {
    return this.service.createLinkToken(req.user.id);
  }

  @Post('exchange')
  @ApiOperation({ summary: 'Exchange Plaid public token' })
  exchangeToken(@Request() req: any, @Body() dto: ExchangeTokenDto) {
    return this.service.exchangeToken(req.user.id, dto.publicToken);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync transactions for all connections' })
  syncTransactions(@Request() req: any) {
    return this.service.syncTransactions(req.user.id);
  }

  @Post('recategorize')
  @ApiOperation({ summary: 'Apply auto-categorization to all uncategorized transactions' })
  recategorizeTransactions(@Request() req: any) {
    return this.service.recategorizeTransactions(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bank connections' })
  getConnections(@Request() req: any) {
    return this.service.getConnections(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a bank connection' })
  deleteConnection(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteConnection(req.user.id, id);
  }
}
