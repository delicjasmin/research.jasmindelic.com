export const PDF_QUEUE = "pdf-processing";

export type PdfJobData = {
  documentId: string;
  url: string;
};

export type PdfJobResult = {
  documentId: string;
  summary: string;
  chunkCount: number;
};

export const PDF_JOB_NAME = "process-pdf";
