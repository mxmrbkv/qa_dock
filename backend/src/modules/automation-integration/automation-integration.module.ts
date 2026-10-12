import { Module } from '@nestjs/common';
import { AutomationIntegrationService } from './automation-integration.service';
import { AutomationIntegrationController } from './automation-integration.controller';

@Module({
  controllers: [AutomationIntegrationController],
  providers: [AutomationIntegrationService],
  exports: [AutomationIntegrationService],
})
export class AutomationIntegrationModule {}
