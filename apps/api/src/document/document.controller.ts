import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { DocumentService } from "./document.service";

@Controller("documents")
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  create(@Body() body: CreateDocumentDto) {
    return this.documentService.createDocument(body.url);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.documentService.getDocument(id);
  }
}
