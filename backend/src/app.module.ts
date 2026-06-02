import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
  controllers: [RagController],
  providers: [PrismaService, RagService],
})
export class AppModule {}
