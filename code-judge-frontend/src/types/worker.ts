import type { SourceSymbol, SymbolDiff } from "./completion";

/**
 * Messages sent from main thread to Web Worker.
 */
export interface WorkerRequest {
  type: "extract" | "computeDiff";
  payload: {
    languageId: string;
    document?: string;
    oldDoc?: string;
    newDoc?: string;
  };
}

/**
 * Messages sent from Web Worker to main thread.
 */
export interface WorkerResponse {
  type: "extractResult" | "diffResult";
  payload: SourceSymbol[] | SymbolDiff;
}