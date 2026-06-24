import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  documentId?: string;
}
