/**
 * Web Worker wrapper for the symbol extractor.
 *
 * Runs symbol extraction off the main thread for large files (>=1000 lines).
 *
 * Messages expected (WorkerRequest):
 *   { type: "extract",        payload: { languageId, document } }
 *   { type: "computeDiff",    payload: { languageId, oldDoc, newDoc } }
 *
 * Messages posted (WorkerResponse):
 *   { type: "extractResult",  payload: SourceSymbol[] }
 *   { type: "diffResult",     payload: SymbolDiff }
 */

import {
  createExtractor,
  isLanguageSupported,
} from "../utils/code/symbolExtractor";
import type { WorkerRequest, WorkerResponse } from "../types/worker";

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { requestId, type, payload } = event.data;
  const { languageId } = payload;

  if (!isLanguageSupported(languageId)) {
    const response: WorkerResponse =
      type === "extract"
        ? { requestId, type: "extractResult", payload: [] }
        : { requestId, type: "diffResult", payload: { removed: [], added: [] } };
    self.postMessage(response);
    return;
  }

  try {
    const extractor = createExtractor(languageId);

    if (type === "extract" && payload.document !== undefined) {
      const symbols = extractor.extract(payload.document);
      const response: WorkerResponse = { requestId, type: "extractResult", payload: symbols };
      self.postMessage(response);
    } else if (
      type === "computeDiff" &&
      payload.oldDoc !== undefined &&
      payload.newDoc !== undefined
    ) {
      const diff = extractor.computeDiff(payload.oldDoc, payload.newDoc);
      const response: WorkerResponse = { requestId, type: "diffResult", payload: diff };
      self.postMessage(response);
    }
  } catch (error) {
    const response: WorkerResponse =
      type === "extract"
        ? { requestId, type: "extractResult", payload: [] }
        : { requestId, type: "diffResult", payload: { removed: [], added: [] } };
    self.postMessage(response);
  }
};
