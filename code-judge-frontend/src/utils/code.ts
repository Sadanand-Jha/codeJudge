export {
  createExtractor,
  isLanguageSupported,
  CppSymbolExtractor,
  JavaSymbolExtractor,
  PythonSymbolExtractor,
  JavaScriptSymbolExtractor,
} from "./code/symbolExtractor";

export {
  getSymbols,
  updateSymbols,
  applyDiff,
  clearCache,
  getAllIdentifiers,
  getSymbolsByPrefix,
} from "./code/symbolCache";