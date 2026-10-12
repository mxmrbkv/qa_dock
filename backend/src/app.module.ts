import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TestCasesModule } from './modules/test-cases/test-cases.module';
import { TagsModule } from './modules/tags/tags.module';
import { TestPlansModule } from './modules/test-plans/test-plans.module';
import { TestRunsModule } from './modules/test-runs/test-runs.module';
import { AutomationIntegrationModule } from './modules/automation-integration/automation-integration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    TestCasesModule,
    TagsModule,
    TestPlansModule,
    TestRunsModule,
    AutomationIntegrationModule,
  ],
})
export class AppModule {}
