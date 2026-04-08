import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreateJimengTaskDto } from './dto/create-jimeng-task.dto';
import { GenerationService } from './generation.service';

@ApiTags('generation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('generate/jimeng/tasks')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post()
  @ApiOperation({ summary: '创建即梦生成任务' })
  createTask(@CurrentUser() user: RequestUser, @Body() dto: CreateJimengTaskDto) {
    return this.generationService.createJimengTask(user.userId, dto);
  }

  @Get(':taskId')
  @ApiOperation({ summary: '查询即梦任务' })
  getTask(@CurrentUser() user: RequestUser, @Param('taskId') taskId: string) {
    return this.generationService.getTask(user.userId, taskId);
  }
}
