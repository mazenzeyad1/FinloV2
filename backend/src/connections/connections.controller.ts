import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ExchangeTokenDto } from './dto/connect.dto';

@ApiTags('connections')
@Controller('connections')
export class ConnectionsController {
  constructor(private service: ConnectionsService) {}

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  @ApiOperation({ summary: 'Plaid webhook receiver' })
  handleWebhook(@Body() body: any) {
    const { webhook_type, webhook_code, item_id } = body;
    // Fire-and-forget — Plaid expects a fast 200 response
    this.service.handlePlaidWebhook(webhook_type, webhook_code, item_id).catch((err) =>
      console.error('[PlaidWebhook] Handler error:', err instanceof Error ? err.message : err),
    );
    return { received: true };
  }

  @Post('link-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Plaid link token' })
  createLinkToken(@Request() req: any) {
    return this.service.createLinkToken(req.user.id);
  }

  @Post('exchange')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(201)
  @ApiOperation({ summary: 'Exchange Plaid public token' })
  exchangeToken(@Request() req: any, @Body() dto: ExchangeTokenDto) {
    return this.service.exchangeToken(req.user.id, dto.publicToken);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync transactions for all connections' })
  syncTransactions(@Request() req: any) {
    return this.service.syncTransactions(req.user.id);
  }

  @Post('recategorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply auto-categorization to all uncategorized transactions' })
  recategorizeTransactions(@Request() req: any) {
    return this.service.recategorizeTransactions(req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bank connections' })
  getConnections(@Request() req: any) {
    return this.service.getConnections(req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a bank connection' })
  deleteConnection(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteConnection(req.user.id, id);
  }
}
