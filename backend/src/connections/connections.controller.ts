import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ExchangeTokenDto } from './dto/connect.dto';

@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private service: ConnectionsService) {}

  @Post('link-token')
  createLinkToken(@Request() req: any) {
    return this.service.createLinkToken(req.user.id);
  }

  @Post('exchange')
  exchangeToken(@Request() req: any, @Body() dto: ExchangeTokenDto) {
    return this.service.exchangeToken(req.user.id, dto.publicToken);
  }

  @Post('sync')
  syncTransactions(@Request() req: any) {
    return this.service.syncTransactions(req.user.id);
  }

  @Get()
  getConnections(@Request() req: any) {
    return this.service.getConnections(req.user.id);
  }

  @Delete(':id')
  deleteConnection(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteConnection(req.user.id, id);
  }
}
