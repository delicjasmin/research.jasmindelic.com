import { Body, Controller, Post } from "@nestjs/common";
import { SearchQueryDto } from "./dto/search-query.dto";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  search(@Body() body: SearchQueryDto) {
    return this.searchService.searchByQuery(body.query, {
      limit: body.limit,
      documentId: body.documentId,
    });
  }
}
