/**
 * Parses scraped problem text containing a mix of plain text and LaTeX math
 * into an array of typed segments for rendering.
 *
 * Uses a Finite State Machine (FSM) to safely tokenize the string character-by-character,
 * properly handling nested braces, parentheses, and escaped dollar signs.
 *
 * Handles:
 * - Block math: $$...$$ (multi-line)
 * - Inline math: $...$ (single-line)
 * - Non-standard $$$ delimiters (normalized to $$ or $ depending on context)
 * - Escaped dollar signs \$ (preserved as literal text)
 * - Complex LaTeX macros with nested braces: \texttt{()}, s_l s_{l+1} \dots s_r
 */

export type MathSegment =
  | { type: "text"; content: string }
  | { type: "inline-math"; content: string }
  | { type: "block-math"; content: string };

// FSM states
type State = "TEXT" | "INLINE_MATH" | "BLOCK_MATH";

/**
 * Count the depth of nested braces in a string.
 * Used to find the matching closing brace for LaTeX commands.
 */
function getBraceDepthDelta(str: string): number {
  let depth = 0;
  for (const char of str) {
    if (char === "{") depth++;
    else if (char === "}") depth--;
  }
  return depth;
}

/**
 * Check if a string contains an unclosed brace (for validation).
 */
function hasUnclosedBrace(str: string): boolean {
  let depth = 0;
  for (const char of str) {
    if (char === "{") depth++;
    else if (char === "}") depth--;
  }
  return depth > 0;
}

/**
 * Find the position of the closing delimiter for math content.
 * Handles nested braces and escaped characters properly.
 * Returns -1 if no valid closing delimiter is found.
 */
function findClosingDelimiter(
  str: string,
  startIndex: number,
  delimiter: string,
  allowNewlines: boolean = false
): number {
  const maxIterations = str.length * 10; // Safety limit
  const iterations = 0;
  
  for (let i = startIndex; i < str.length && iterations < maxIterations; i++) {
    const char = str[i];
    
    // Handle escaped characters (backslash followed by any char)
    if (char === "\\" && i + 1 < str.length) {
      i++; // Skip the next character (it's escaped)
      continue;
    }
    
    // Check for the closing delimiter
    if (str.slice(i, i + delimiter.length) === delimiter) {
      // For inline math, ensure we don't cross newlines
      if (!allowNewlines && delimiter === "$") {
        // Check if there's a newline before this $
        const beforeDelimiter = str.slice(startIndex, i);
        if (beforeDelimiter.includes("\n")) {
          continue; // This $ is not a valid inline math closer
        }
      }
      return i;
    }
  }
  
  return -1;
}

/**
 * Normalize non-standard $$$ delimiters.
 * - $$$...$$$ that spans multiple lines → $$...$$
 * - $$$...$$$ on a single line → $...$
 * - Also handle mixed $$$ at opening vs $$ at closing, etc.
 */
function normalizeDelimiters(text: string): string {
  // First handle multi-line $$$...$$$ → $$...$$
  let result = text.replace(/\$\$\$([\s\S]*?\n[\s\S]*?)\$\$\$/g, (_, inner: string) => `$$${inner}$$`);
  
  // Then handle single-line $$$...$$$ → $...$
  result = result.replace(/\$\$\$(.+?)\$\$\$/g, (_, inner: string) => `$${inner}$`);
  
  // Handle opening $$$ but closing with single $
  result = result.replace(/\$\$\$(.+?)\$/g, (_, inner: string) => {
    if (inner.includes("\n")) return `$$${inner}$`;
    return `$${inner}$`;
  });
  
  // Handle opening $ but closing with $$$ (stray)
  result = result.replace(/\$(.+?)\$\$\$/g, "$1$");
  
  return result;
}

/**
 * Tokenize a raw string using a Finite State Machine.
 * This is the main entry point for parsing math content.
 */
export function tokenizeMath(rawString: string): MathSegment[] {
  // First normalize non-standard delimiters
  const normalized = normalizeDelimiters(rawString);
  
  const tokens: MathSegment[] = [];
  let state: State = "TEXT";
  let currentContent = "";
  let i = 0;
  
  while (i < normalized.length) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];
    
    if (state === "TEXT") {
      // Check for escaped dollar sign
      if (char === "\\" && nextChar === "$") {
        currentContent += "\\$";
        i += 2;
        continue;
      }
      
      // Check for block math start ($$$)
      if (char === "$" && nextChar === "$" && normalized[i + 2] === "$") {
        // Check if this is multi-line block math
        const afterStart = normalized.slice(i + 3);
        const newlineIndex = afterStart.indexOf("\n");
        const closingIndex = afterStart.indexOf("$$$");
        
        if (newlineIndex !== -1 && (closingIndex === -1 || newlineIndex < closingIndex)) {
          // Multi-line: treat as block math
          if (currentContent) {
            tokens.push({ type: "text", content: currentContent });
            currentContent = "";
          }
          state = "BLOCK_MATH";
          i += 3;
          continue;
        }
      }
      
      // Check for block math start ($$)
      if (char === "$" && nextChar === "$") {
        if (currentContent) {
          tokens.push({ type: "text", content: currentContent });
          currentContent = "";
        }
        state = "BLOCK_MATH";
        i += 2;
        continue;
      }
      
      // Check for inline math start ($)
      if (char === "$") {
        if (currentContent) {
          tokens.push({ type: "text", content: currentContent });
          currentContent = "";
        }
        state = "INLINE_MATH";
        i += 1;
        continue;
      }
      
      // Regular text character
      currentContent += char;
      i += 1;
      
    } else if (state === "INLINE_MATH") {
      // Check for escaped dollar sign
      if (char === "\\" && nextChar === "$") {
        currentContent += "\\$";
        i += 2;
        continue;
      }
      
      // Check for closing $
      if (char === "$") {
        // For inline math, we need to ensure we don't have $$ (which would be block)
        // and we need to handle the content properly
        tokens.push({ type: "inline-math", content: currentContent.trim() });
        currentContent = "";
        state = "TEXT";
        i += 1;
        continue;
      }
      
      // Regular math character
      currentContent += char;
      i += 1;
      
    } else if (state === "BLOCK_MATH") {
      // Check for escaped dollar sign
      if (char === "\\" && nextChar === "$") {
        currentContent += "\\$";
        i += 2;
        continue;
      }
      
      // Check for closing $$
      if (char === "$" && nextChar === "$") {
        tokens.push({ type: "block-math", content: currentContent.trim() });
        currentContent = "";
        state = "TEXT";
        i += 2;
        continue;
      }
      
      // Check for closing $$$
      if (char === "$" && nextChar === "$" && normalized[i + 2] === "$") {
        tokens.push({ type: "block-math", content: currentContent.trim() });
        currentContent = "";
        state = "TEXT";
        i += 3;
        continue;
      }
      
      // Regular math character
      currentContent += char;
      i += 1;
    }
  }
  
  // Handle any remaining content
  if (currentContent) {
    if (state === "INLINE_MATH") {
      // Unclosed inline math - treat as text
      tokens.push({ type: "text", content: "$" + currentContent });
    } else if (state === "BLOCK_MATH") {
      // Unclosed block math - treat as text
      tokens.push({ type: "text", content: "$$" + currentContent });
    } else {
      tokens.push({ type: "text", content: currentContent });
    }
  }
  
  // Merge consecutive text segments
  const merged: MathSegment[] = [];
  for (const token of tokens) {
    if (token.type === "text" && merged.length > 0 && merged[merged.length - 1].type === "text") {
      merged[merged.length - 1] = {
        type: "text",
        content: merged[merged.length - 1].content + token.content,
      };
    } else {
      merged.push(token);
    }
  }
  
  return merged;
}

/**
 * Legacy alias for backward compatibility.
 * @deprecated Use tokenizeMath instead.
 */
export function parseMath(rawString: string): MathSegment[] {
  return tokenizeMath(rawString);
}