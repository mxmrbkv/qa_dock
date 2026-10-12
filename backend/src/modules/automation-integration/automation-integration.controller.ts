import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AutomationIntegrationService } from './automation-integration.service';
import { AutomationJsonPayloadDto } from './dto/automation-json-payload.dto';

@Controller('api/v1/projects/:projectId/automation')
export class AutomationIntegrationController {
  constructor(
    private readonly automationService: AutomationIntegrationService,
  ) {}

  @Post('results')
  @HttpCode(HttpStatus.OK)
  async ingestResults(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @Headers('content-type') contentType: string = 'application/json',
    @Req() req: Request,
  ) {
    // If raw body text is provided (e.g. from curl with XML)
    const payload = req.body || body;
    return this.automationService.processResults(projectId, payload, contentType);
  }
}
