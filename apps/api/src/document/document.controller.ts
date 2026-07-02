import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { DocumentService } from "./document.service";

@Controller("documents")
@UseGuards(AuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  create(@Body() body: CreateDocumentDto, @CurrentUser() user: AuthUser) {
    return this.documentService.createDocument(body.url, user.id);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.documentService.getDocumentForUser(id, user.id);
  }
}
