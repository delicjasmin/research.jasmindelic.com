-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "forkedFromConversationId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_forkedFromConversationId_idx" ON "Conversation"("forkedFromConversationId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_forkedFromConversationId_fkey" FOREIGN KEY ("forkedFromConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
