/**
 * Incremental symbol table cache.
 *
 * Maintains a map of fileId -> SourceSymbol[] and provides methods
 * for full replacement, incremental diff application, and prefix matching.
 */

import type { SourceSymbol, SymbolDiff } from "@/types/completion";

/**
 * In-memory symbol table.
 * Keyed by fileId (e.g. "code.cpp", "code.java").
 */
const symbolTable = new Map<string, SourceSymbol[]>();

/**
 * Get cached symbols for a file.
 */
export function getSymbols(fileId: string): SourceSymbol[] {
  return symbolTable.get(fileId) ?? [];
}

/**
 * Replace the entire cache entry for a file.
 */
export function updateSymbols(fileId: string, symbols: SourceSymbol[]): void {
  symbolTable.set(fileId, symbols);
}

/**
 * Incrementally update the cache using a SymbolDiff.
 * Removes symbols by name, then adds new ones.
 */
export function applyDiff(fileId: string, diff: SymbolDiff): void {
  const current = symbolTable.get(fileId) ?? [];
  const removedSet = new Set(diff.removed);
  const filtered = current.filter((s) => !removedSet.has(s.name));
  const existingNames = new Set(filtered.map((s) => s.name));

  // Only add symbols that don't already exist (no duplicates)
  for (const sym of diff.added) {
    if (!existingNames.has(sym.name)) {
      filtered.push(sym);
      existingNames.add(sym.name);
    }
  }

  symbolTable.set(fileId, filtered);
}

/**
 * Clear cache for a specific file, or all files if no fileId given.
 */
export function clearCache(fileId?: string): void {
  if (fileId) {
    symbolTable.delete(fileId);
  } else {
    symbolTable.clear();
  }
}

/**
 * Get all unique symbol names for a file (for prefix matching).
 */
export function getAllIdentifiers(fileId: string): string[] {
  const symbols = symbolTable.get(fileId) ?? [];
  return [...new Set(symbols.map((s) => s.name))];
}

/**
 * Get symbols matching a given prefix (case-insensitive).
 */
export function getSymbolsByPrefix(fileId: string, prefix: string): SourceSymbol[] {
  if (!prefix) return [];
  const lower = prefix.toLowerCase();
  const symbols = symbolTable.get(fileId) ?? [];
  return symbols.filter((s) => s.name.toLowerCase().startsWith(lower));
}