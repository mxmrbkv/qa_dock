import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/projects/:projectId/tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.tagsService.create(projectId, dto);
  }

  @Get()
  async findAll(@Param('projectId') projectId: string) {
    return this.tagsService.findAll(projectId);
  }

  @Delete(':id')
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.tagsService.remove(projectId, id);
  }
}
