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
import { TestSuitesService } from './test-suites.service';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/projects/:projectId/suites')
@UseGuards(JwtAuthGuard)
export class TestSuitesController {
  constructor(private readonly testSuitesService: TestSuitesService) {}

  @Get()
  async findAll(@Param('projectId') projectId: string) {
    return this.testSuitesService.findAll(projectId);
  }

  @Get(':id')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.testSuitesService.findOne(projectId, id);
  }

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTestSuiteDto,
  ) {
    return this.testSuitesService.create(projectId, dto);
  }

  @Patch(':id')
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTestSuiteDto,
  ) {
    return this.testSuitesService.update(projectId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.testSuitesService.remove(projectId, id);
  }
}
