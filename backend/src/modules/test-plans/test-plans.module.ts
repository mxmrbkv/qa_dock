import { Module } from '@nestjs/common';
import { TestPlansService } from './test-plans.service';
import { TestPlansController } from './test-plans.controller';

@Module({
  controllers: [TestPlansController],
  providers: [TestPlansService],
  exports: [TestPlansService],
})
export class TestPlansModule {}
