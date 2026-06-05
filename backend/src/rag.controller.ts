import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { RagService } from './rag.service';

class UploadDto {
  @IsString() @MinLength(1) title: string;
  @IsString() @MinLength(1) text: string;
}
class AskDto {
  @IsString() @MinLength(1) question: string;
}

@Controller()
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Post('documents')
  upload(@Body() dto: UploadDto) {
    return this.rag.indexDocument(dto.title, dto.text);
  }

  @Get('documents')
  list() {
    return this.rag.listDocuments();
  }

  @Get('stats')
  stats() {
    return this.rag.stats();
  }

  @Post('ask')
  ask(@Body() dto: AskDto) {
    return this.rag.ask(dto.question);
  }
}
