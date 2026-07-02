import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import { ConversationService } from "./conversation.service";

@Controller("conversations")
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get("shared/:token")
  getShared(@Param("token") token: string) {
    return this.conversationService.getSharedConversation(token);
  }

  @Get()
  @UseGuards(AuthGuard)
  list(
    @CurrentUser() user: AuthUser,
    @Query("documentId") documentId?: string,
  ) {
    return this.conversationService.listConversations(user.id, documentId);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.conversationService.getConversation(id, user.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: CreateConversationDto, @CurrentUser() user: AuthUser) {
    return this.conversationService.createForDocument(body.documentId, user.id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  update(
    @Param("id") id: string,
    @Body() body: UpdateConversationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.conversationService.updateTitle(id, user.id, body.title);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.conversationService.deleteConversation(id, user.id);
  }

  @Post(":id/share")
  @UseGuards(AuthGuard)
  share(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.conversationService.enableSharing(id, user.id);
  }

  @Delete(":id/share")
  @UseGuards(AuthGuard)
  unshare(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.conversationService.disableSharing(id, user.id);
  }
}
