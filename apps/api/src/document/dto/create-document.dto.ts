import { IsNotEmpty, IsString, IsUrl } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  url!: string;
}
