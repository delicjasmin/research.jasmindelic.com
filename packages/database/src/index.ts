export { prisma, type PrismaClientType } from "./client.js";
export { EMBEDDING_DIMENSIONS } from "./constants.js";
export {
  DOCUMENTS_PER_DAY,
  QUESTIONS_PER_DAY,
  MAX_PDF_PAGES,
  MAX_PDF_SIZE_BYTES,
  isUnlimitedPlan,
} from "./limits.js";
export {
  searchSimilarChunks,
  setChunkEmbedding,
  type SearchSimilarChunksOptions,
  type SimilarChunkResult,
} from "./vector-search.js";
export * from "../generated/prisma/client.js";
