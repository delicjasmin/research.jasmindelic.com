"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Source = {
  id: string;
  content: string;
  pageNumber: number;
  similarity: number;
};

export type DocumentProgressEvent = { documentId: string; progress: number };
export type DocumentReadyEvent = {
  documentId: string;
  title: string | null;
  summary: string;
};
export type DocumentErrorEvent = { documentId: string; message: string };
export type AnswerChunkEvent = { content: string };
export type AnswerDoneEvent = {
  sources: Source[];
  assistantMessageId?: string;
};
export type AnswerErrorEvent = { message: string };

export type ResearchSocketCallbacks = {
  onProgress?: (event: DocumentProgressEvent) => void;
  onReady?: (event: DocumentReadyEvent) => void;
  onDocumentError?: (event: DocumentErrorEvent) => void;
  onAnswerChunk?: (event: AnswerChunkEvent) => void;
  onAnswerDone?: (event: AnswerDoneEvent) => void;
  onAnswerError?: (event: AnswerErrorEvent) => void;
};

export function useResearchSocket(
  documentId: string,
  callbacks: ResearchSocketCallbacks,
) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const socket = io(API_BASE, { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("subscribe-document", { documentId });
    });

    socket.on("document:progress", (e: DocumentProgressEvent) =>
      callbacksRef.current.onProgress?.(e),
    );
    socket.on("document:ready", (e: DocumentReadyEvent) =>
      callbacksRef.current.onReady?.(e),
    );
    socket.on("document:error", (e: DocumentErrorEvent) =>
      callbacksRef.current.onDocumentError?.(e),
    );
    socket.on("answer:chunk", (e: AnswerChunkEvent) =>
      callbacksRef.current.onAnswerChunk?.(e),
    );
    socket.on("answer:done", (e: AnswerDoneEvent) =>
      callbacksRef.current.onAnswerDone?.(e),
    );
    socket.on("answer:error", (e: AnswerErrorEvent) =>
      callbacksRef.current.onAnswerError?.(e),
    );

    return () => {
      socket.disconnect();
    };
  }, [documentId]);

  const ask = useCallback(
    (conversationId: string, question: string) => {
      socketRef.current?.emit("ask", { documentId, conversationId, question });
    },
    [documentId],
  );

  return { ask };
}
