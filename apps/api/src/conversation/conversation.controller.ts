import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import { ConversationService } from "./conversation.service";

@Controller("conversations")
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  list(@Query("documentId") documentId?: string) {
    return this.conversationService.listConversations(documentId);
  }

  @Get("shared/:token")
  getShared(@Param("token") token: string) {
    return this.conversationService.getSharedConversation(token);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.conversationService.getConversation(id);
  }

  @Post()
  create(@Body() body: CreateConversationDto) {
    return this.conversationService.createForDocument(body.documentId);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateConversationDto) {
    return this.conversationService.updateTitle(id, body.title);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.conversationService.deleteConversation(id);
  }

  @Post(":id/share")
  share(@Param("id") id: string) {
    return this.conversationService.enableSharing(id);
  }

  @Delete(":id/share")
  unshare(@Param("id") id: string) {
    return this.conversationService.disableSharing(id);
  }
}
