import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { AiCategorizerService } from '../common/ai/ai-categorizer.service';

@Module({
  providers: [ConnectionsService, AiCategorizerService],
  controllers: [ConnectionsController],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
