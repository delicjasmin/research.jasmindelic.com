-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column for semantic search (text-embedding-3-small dimensions)
ALTER TABLE "DocumentChunk" ADD COLUMN "embedding" vector(1536);

-- HNSW index for cosine similarity search
CREATE INDEX "DocumentChunk_embedding_hnsw_idx" ON "DocumentChunk" USING hnsw ("embedding" vector_cosine_ops);

-- Index for filtering chunks by document
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- Replace RESTRICT with CASCADE on document deletion
ALTER TABLE "DocumentChunk" DROP CONSTRAINT "DocumentChunk_documentId_fkey";
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
