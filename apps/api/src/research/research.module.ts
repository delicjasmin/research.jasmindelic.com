import { Module } from "@nestjs/common";
import { ResearchGateway } from "./research.gateway";
import { SearchModule } from "../search/search.module";
import { DocumentModule } from "../document/document.module";
import { ConversationModule } from "../conversation/conversation.module";

@Module({
  imports: [SearchModule, DocumentModule, ConversationModule],
  providers: [ResearchGateway],
})
export class ResearchModule {}
