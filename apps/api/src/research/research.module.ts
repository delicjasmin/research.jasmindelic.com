import { Module } from "@nestjs/common";
import { ResearchGateway } from "./research.gateway";
import { SearchModule } from "../search/search.module";
import { DocumentModule } from "../document/document.module";
import { ConversationModule } from "../conversation/conversation.module";
import { UsageModule } from "../usage/usage.module";

@Module({
  imports: [SearchModule, DocumentModule, ConversationModule, UsageModule],
  providers: [ResearchGateway],
})
export class ResearchModule {}
