import { Suspense } from "react";
import { fetchDocument } from "@/lib/api";
import { DocumentView } from "./document-view";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await fetchDocument(id).catch(() => null);

  return (
    <Suspense>
      <DocumentView documentId={id} initialDocument={document} />
    </Suspense>
  );
}
