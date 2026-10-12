import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { BulkActionDto, FilterTestCaseDto } from './dto/filter-test-case.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/projects/:projectId/test-cases')
@UseGuards(JwtAuthGuard)
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTestCaseDto,
  ) {
    return this.testCasesService.create(projectId, dto);
  }

  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @Query() filter: FilterTestCaseDto,
  ) {
    return this.testCasesService.findAll(projectId, filter);
  }

  @Get(':id')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.testCasesService.findOne(projectId, id);
  }

  @Patch(':id')
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.testCasesService.update(projectId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.testCasesService.remove(projectId, id);
  }

  @Post('bulk')
  async bulkAction(
    @Param('projectId') projectId: string,
    @Body() dto: BulkActionDto,
  ) {
    return this.testCasesService.bulkAction(projectId, dto);
  }
}
