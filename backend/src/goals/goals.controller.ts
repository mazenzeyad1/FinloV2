import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private service: GoalsService) {}

  @Get()
  getGoals(@Request() req: any) {
    return this.service.getGoals(req.user.id);
  }

  @Post()
  createGoal(@Request() req: any, @Body() dto: any) {
    return this.service.createGoal(req.user.id, dto);
  }

  @Patch(':id')
  updateGoal(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateGoal(req.user.id, id, dto);
  }

  @Delete(':id')
  deleteGoal(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteGoal(req.user.id, id);
  }

  @Post(':id/contribute')
  addContribution(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.addContribution(req.user.id, id, dto);
  }
}
