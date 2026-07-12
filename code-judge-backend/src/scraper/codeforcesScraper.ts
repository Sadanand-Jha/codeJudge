/**
 * ================================================================
 * Codeforces Problem Scraper
 * ================================================================
 * 
 * This scraper fetches problem statements from Codeforces and preserves
 * all formatting including:
 * - Paragraph breaks
 * - Empty lines between sections
 * - Bullet lists
 * - Numbered lists
 * - Indentation
 * - Mathematical expressions
 * - Code blocks
 * - Multiple consecutive newlines
 * 
 * The scraper stores the HTML content as-is in the database.
 * ================================================================
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

interface CodeforcesProblem {
  problemId: string;
  contestId: string | null;
  problemIndex: string | null;
  title: string;
  statement: string;
  inputSpecification: string;
  outputSpecification: string;
  constraints: string | null;
  notes: string | null;
  sampleTests: Array<{
    input: string;
    output: string;
    explanation: string | null;
  }>;
  timeLimit: number;
  memoryLimit: number;
  rating: number | null;
  tags: string[];
}

/**
 * Fetches a problem from Codeforces and returns structured data.
 * Preserves all HTML formatting in the statement.
 */
export async function scrapeCodeforcesProblem(
  contestId: string,
  problemIndex: string
): Promise<CodeforcesProblem> {
  const url = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
  
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CodeJudge/1.0)",
    },
  });

  const $ = cheerio.load(response.data);
  
  // Extract problem title
  const title = $(".problem-statement .header .title").text().trim();
  
  // Extract time and memory limits
  const limitsText = $(".problem-statement .header .time-limit").text();
  const timeLimitMatch = limitsText.match(/(\d+)\s*ms/);
  const timeLimit = timeLimitMatch ? parseInt(timeLimitMatch[1]) : 2000;
  
  const memoryMatch = limitsText.match(/(\d+)\s*MB/);
  const memoryLimit = memoryMatch ? parseInt(memoryMatch[1]) : 256;

  // Extract the problem statement content - preserve all HTML formatting
  const statementElement = $(".problem-statement").first();
  
  // Get the full HTML content of the problem statement
  // This preserves all formatting including paragraphs, lists, code blocks, etc.
  const statement = extractSectionContent($, statementElement, "statement");
  const inputSpecification = extractSectionContent($, statementElement, "input");
  const outputSpecification = extractSectionContent($, statementElement, "output");
  const constraints = extractSectionContent($, statementElement, "constraints");
  const notes = extractSectionContent($, statementElement, "note");

  // Extract sample tests
  const sampleTests = extractSampleTests($, statementElement);

  // Extract tags
  const tags: string[] = [];
  $(".problem-statement .tags a").each((_index: number, el) => {
    tags.push($(el).text().trim());
  });

  return {
    problemId: `${contestId}${problemIndex}`,
    contestId,
    problemIndex,
    title,
    statement,
    inputSpecification,
    outputSpecification,
    constraints: constraints || null,
    notes: notes || null,
    sampleTests,
    timeLimit,
    memoryLimit,
    rating: null, // Will be populated from rating API
    tags,
  };
}

/**
 * Extracts content from a specific section of the problem statement.
 * Preserves all HTML formatting including paragraphs, lists, and code blocks.
 */
function extractSectionContent(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>,
  sectionType: "statement" | "input" | "output" | "constraints" | "note"
): string {
  // Codeforces uses specific classes for each section
  // We need to find and extract the content while preserving formatting
  
  let selector = "";
  switch (sectionType) {
    case "statement":
      selector = ".problem-text";
      break;
    case "input":
      selector = ".input";
      break;
    case "output":
      selector = ".output";
      break;
    case "constraints":
      selector = ".constraints";
      break;
    case "note":
      selector = ".note";
      break;
  }

  const section = container.find(selector);
  if (section.length === 0) {
    return "";
  }

  // Get the HTML content, preserving all formatting
  return section.html() || "";
}

/**
 * Extracts sample test cases from the problem statement.
 */
function extractSampleTests(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>
): Array<{ input: string; output: string; explanation: string | null }> {
  const tests: Array<{ input: string; output: string; explanation: string | null }> = [];
  
  container.find(".sample-test").each((_index: number, testEl) => {
    const input = $(testEl).find(".input pre").text() || "";
    const output = $(testEl).find(".output pre").text() || "";
    const explanation = $(testEl).find(".explanation").text() || null;
    
    tests.push({ input, output, explanation });
  });

  return tests;
}

/**
 * Scrapes multiple problems from a contest.
 */
export async function scrapeContestProblems(
  contestId: string
): Promise<CodeforcesProblem[]> {
  const problems: CodeforcesProblem[] = [];
  const problemIndices = ["A", "B", "C", "D", "E", "F", "G"];
  
  for (const index of problemIndices) {
    try {
      const problem = await scrapeCodeforcesProblem(contestId, index);
      problems.push(problem);
    } catch (error) {
      // Problem doesn't exist, continue to next
      break;
    }
  }
  
  return problems;
}