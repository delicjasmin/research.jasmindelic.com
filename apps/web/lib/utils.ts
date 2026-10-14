import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pdfPageHref(documentUrl: string, pageNumber: number): string {
  const hash = `page=${pageNumber}`
  try {
    const url = new URL(documentUrl)
    url.hash = hash
    return url.toString()
  } catch {
    return `${documentUrl}#${hash}`
  }
}
