import { Body, Controller, Get, Logger, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreateJimengTaskDto } from './dto/create-jimeng-task.dto';
import { GenerationService } from './generation.service';

@ApiTags('generation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class GenerationController {
  private readonly logger = new Logger(GenerationController.name);

  constructor(private readonly generationService: GenerationService) {}

  @Post('generate/jimeng/tasks')
  @ApiOperation({ summary: '创建即梦生成任务' })
  createTask(@CurrentUser() user: RequestUser, @Body() dto: CreateJimengTaskDto) {
    this.logger.log(`createTask 入参: userId=${user.userId}, taskType=${dto.taskType}, assets=${dto.assets?.length}个, ratio=${dto.ratio}, count=${dto.count}`);
    return this.generationService.createJimengTask(user.userId, dto);
  }

  @Get('generate/jimeng/tasks/:taskId')
  @ApiOperation({ summary: '查询即梦任务' })
  getTask(@CurrentUser() user: RequestUser, @Param('taskId') taskId: string) {
    return this.generationService.getTask(user.userId, taskId);
  }

  @Get('tasks/list')
  @ApiOperation({ summary: '用户任务列表' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'taskType', required: false })
  listTasks(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('taskType') taskType?: string,
  ) {
    return this.generationService.listTasks(user.userId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
      status,
      taskType,
    });
  }

  @Get('tasks/cost-estimate')
  @ApiOperation({ summary: '预估任务积分消耗' })
  @ApiQuery({ name: 'taskType', required: true })
  @ApiQuery({ name: 'resultType', required: false })
  @ApiQuery({ name: 'count', required: false, type: Number })
  costEstimate(
    @Query('taskType') taskType: string,
    @Query('resultType') resultType?: string,
    @Query('count') count?: string,
  ) {
    return this.generationService.costEstimate({
      taskType,
      resultType,
      count: count ? Number(count) : undefined,
    });
  }
}
