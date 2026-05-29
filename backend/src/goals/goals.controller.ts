import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private service: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all savings goals' })
  getGoals(@Request() req: any) {
    return this.service.getGoals(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new savings goal' })
  createGoal(@Request() req: any, @Body() dto: any) {
    return this.service.createGoal(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a savings goal' })
  updateGoal(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateGoal(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a savings goal' })
  deleteGoal(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteGoal(req.user.id, id);
  }

  @Post(':id/contribute')
  @ApiOperation({ summary: 'Add a contribution to a goal' })
  addContribution(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.addContribution(req.user.id, id, dto);
  }
}
