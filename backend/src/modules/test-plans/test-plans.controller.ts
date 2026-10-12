import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TestPlansService } from './test-plans.service';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/projects/:projectId/test-plans')
@UseGuards(JwtAuthGuard)
export class TestPlansController {
  constructor(private readonly testPlansService: TestPlansService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTestPlanDto,
  ) {
    return this.testPlansService.create(projectId, dto);
  }

  @Get()
  async findAll(@Param('projectId') projectId: string) {
    return this.testPlansService.findAll(projectId);
  }

  @Get(':id')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.testPlansService.findOne(projectId, id);
  }

  @Patch(':id')
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTestPlanDto,
  ) {
    return this.testPlansService.update(projectId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.testPlansService.remove(projectId, id);
  }
}
