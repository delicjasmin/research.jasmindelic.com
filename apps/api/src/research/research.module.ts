import { Module } from "@nestjs/common";
import { ResearchGateway } from "./research.gateway";
import { SearchModule } from "../search/search.module";
import { DocumentModule } from "../document/document.module";

@Module({
  imports: [SearchModule, DocumentModule],
  providers: [ResearchGateway],
})
export class ResearchModule {}
