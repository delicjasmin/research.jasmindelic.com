export { prisma, type PrismaClientType } from "./client.js";
export { EMBEDDING_DIMENSIONS } from "./constants.js";
export {
  searchSimilarChunks,
  setChunkEmbedding,
  type SearchSimilarChunksOptions,
  type SimilarChunkResult,
} from "./vector-search.js";
export * from "../generated/prisma/client.js";
