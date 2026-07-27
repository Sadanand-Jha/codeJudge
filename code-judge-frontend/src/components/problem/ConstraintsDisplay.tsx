"use client";

import { useMemo } from "react";

interface ConstraintsDisplayProps {
  constraints: string | null;
}

/**
 * Parses and displays constraints from HTML content.
 * Handles mathematical expressions and formats them beautifully.
 * 
 * Example constraints:
 * - 1 ≤ t ≤ 10⁴
 * - 3 ≤ n ≤ 2 × 10⁵
 * - 1 ≤ ai ≤ 3
 * - Sum of n ≤ 2 × 10⁵
 */
export default function ConstraintsDisplay({ constraints }: ConstraintsDisplayProps) {
  const parsedConstraints = useMemo(() => {
    if (!constraints) return [];

    try {
      // Parse the HTML to extract constraint text
      // Handle common Codeforces constraint formats
      const parser = new DOMParser();
      const doc = parser.parseFromString(constraints, "text/html");
      
      // Get all text content, preserving structure
      const textContent = doc.body.textContent || "";
      
      // Split by lines and filter out empty lines
      const lines = textContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      return lines;
    } catch (error) {
      console.error("Error parsing constraints:", error);
      return [];
    }
  }, [constraints]);

  if (!constraints) return null;

  try {
    return (
      <ul className="space-y-1 pl-6 list-disc text-[#222]">
        {parsedConstraints.map((constraint, index) => (
          <li
            key={index}
            className="text-base leading-relaxed"
          >
            <span 
              className="constraint-text"
              dangerouslySetInnerHTML={{ __html: formatConstraint(constraint) }}
            />
          </li>
        ))}
      </ul>
    );
  } catch (error) {
    console.error("Error rendering constraints:", error);
    return (
      <pre className="text-sm text-[#222]">{constraints}</pre>
    );
  }
}

/**
 * Formats constraint text with proper mathematical symbols.
 * Converts plain text constraints to HTML with styled elements.
 */
function formatConstraint(text: string): string {
  // Handle common mathematical symbols and format them
  let formatted = text;
  
  // Handle "1 ≤ t ≤ 10⁴" style constraints (with superscript numbers)
  // Pattern: number ≤ variable ≤ number (with possible × and superscript)
  formatted = formatted.replace(
    /(\d+)\s*≤\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*≤\s*([\d\s×⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,
    '<span class="font-mono">$1&nbsp;≤&nbsp;<var class="font-medium text-[#111827]">$2</var>&nbsp;≤&nbsp;$3</span>'
  );
  
  // Handle "1 ≤ ai ≤ 3" style constraints (simple numbers)
  formatted = formatted.replace(
    /(\d+)\s*≤\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*≤\s*(\d+)/g,
    '<span class="font-mono">$1&nbsp;≤&nbsp;<var class="font-medium text-[#111827]">$2</var>&nbsp;≤&nbsp;$3</span>'
  );
  
  // Handle "Sum of n ≤ 2 × 10⁵" style constraints
  formatted = formatted.replace(
    /(Sum\s+of\s+[a-zA-Z_]+)\s*≤\s*([\d\s×⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,
    '<span class="font-mono"><span class="text-[#111827]">$1</span>&nbsp;≤&nbsp;$2</span>'
  );
  
  // Handle subscript notation (e.g., a_i)
  formatted = formatted.replace(
    /([a-zA-Z])_([a-zA-Z0-9])/g,
    '$1<sub class="align-sub">$2</sub>'
  );
  
  // Handle multiplication symbol
  formatted = formatted.replace(/×/g, '&times;');
  
  // Handle superscript numbers (for exponents like 10^5)
  formatted = formatted.replace(
    /([\d.]+)\^(\d+)/g,
    '$1<sup class="align-super">$2</sup>'
  );
  
  return formatted;
}