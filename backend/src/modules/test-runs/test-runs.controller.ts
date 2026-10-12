import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TestRunsService } from './test-runs.service';
import { CreateTestRunDto, UpdateTestResultDto } from './dto/create-test-run.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/projects/:projectId/test-runs')
@UseGuards(JwtAuthGuard)
export class TestRunsController {
  constructor(private readonly testRunsService: TestRunsService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTestRunDto,
  ) {
    return this.testRunsService.create(projectId, userId, dto);
  }

  @Get()
  async findAll(@Param('projectId') projectId: string) {
    return this.testRunsService.findAll(projectId);
  }

  @Get(':id')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.testRunsService.findOne(projectId, id);
  }

  @Patch(':id/results/:resultId')
  async updateResult(
    @Param('projectId') projectId: string,
    @Param('id') runId: string,
    @Param('resultId') resultId: string,
    @Body() dto: UpdateTestResultDto,
  ) {
    return this.testRunsService.updateResult(projectId, runId, resultId, dto);
  }
}
