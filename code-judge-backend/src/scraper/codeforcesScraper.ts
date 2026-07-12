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
  
  // Extract the main problem-statement div
  const statementElement = $(".problem-statement").first();
  
  // Extract problem title
  const title = statementElement.find(".header .title").text().trim();
  
  // Extract time and memory limits
  const limitsText = statementElement.find(".header .time-limit").text();
  const timeLimitMatch = limitsText.match(/(\d+)\s*ms/);
  const timeLimit = timeLimitMatch ? parseInt(timeLimitMatch[1]) : 2000;
  
  const memoryMatch = limitsText.match(/(\d+)\s*MB/);
  const memoryLimit = memoryMatch ? parseInt(memoryMatch[1]) : 256;

  // Extract the problem statement HTML.
  // In Codeforces HTML structure, the children of .problem-statement are:
  //   0: <div class="header">...</div>
  //   1: <div> (plain div - this IS the problem statement)
  //   2: <div class="input-specification">...</div>
  //   3: <div class="output-specification">...</div>
  //   4: <div class="sample-tests">...</div>
  //   5: <div class="note">...</div>
  const statement = extractStatement($, statementElement);
  const inputSpecification = extractSectionContent($, statementElement, "input");
  const outputSpecification = extractSectionContent($, statementElement, "output");
  const notes = extractSectionContent($, statementElement, "note");

  // Extract sample tests
  const sampleTests = extractSampleTests($, statementElement);

  // Extract tags
  const tags: string[] = extractTags($);

  return {
    problemId: `${contestId}${problemIndex}`,
    contestId,
    problemIndex,
    title,
    statement,
    inputSpecification,
    outputSpecification,
    constraints: null,
    notes: notes || null,
    sampleTests,
    timeLimit,
    memoryLimit,
    rating: null,
    tags,
  };
}

/**
 * Extracts the problem statement HTML.
 * The statement is the child div of .problem-statement that comes right after .header
 * and has no specific class (plain div).
 */
function extractStatement(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>
): string {
  const children = container.children();
  let statementHtml = "";
  
  children.each((_i: number, el: AnyNode) => {
    const $el = $(el);
    const tagName = ($el.prop("tagName") || "").toLowerCase();
    
    if (tagName !== "div") {
      return;
    }
    
    const cls = $el.attr("class") || "";
    
    if (cls.includes("header")) {
      return;
    }
    
    if (!cls.includes("input") && !cls.includes("output") && !cls.includes("sample") && !cls.includes("note")) {
      statementHtml = $el.html() || "";
      return false;
    }
  });
  
  return statementHtml;
}

/**
 * Extracts content from a specific section of the problem statement.
 * Preserves all HTML formatting including paragraphs, lists, and code blocks.
 */
function extractSectionContent(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>,
  sectionType: "input" | "output" | "note"
): string {
  let selector = "";
  switch (sectionType) {
    case "input":
      selector = ".input-specification";
      break;
    case "output":
      selector = ".output-specification";
      break;
    case "note":
      selector = ".note";
      break;
  }

  const section = container.find(selector);
  if (section.length === 0) {
    return "";
  }

  return section.html() || "";
}

/**
 * Extracts sample test cases from the problem statement.
 * 
 * Codeforces wraps sample test input/output inside <div class="test-example-line"> elements
 * (not inside <pre>). We need to:
 * 1. Find each .sample-test block
 * 2. For input: find all .test-example-line divs inside .input pre
 * 3. Extract only textContent from each line, join with '\n'
 * 4. Same for output
 * 5. If no .test-example-line divs found, fall back to getting the text directly from <pre>
 */
export function extractSampleTests(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>
): Array<{ input: string; output: string; explanation: string | null }> {
  const tests: Array<{ input: string; output: string; explanation: string | null }> = [];
  
  container.find(".sample-test").each((_index: number, testEl) => {
    // Extract input - prefer .test-example-line divs, fallback to <pre> text
    const input = extractTestLines($, $(testEl).find(".input pre"));
    const output = extractTestLines($, $(testEl).find(".output pre"));
    
    // Explanation is optional and we keep its HTML as-is (it may contain formatting)
    let explanation: string | null = null;
    const explanationEl = $(testEl).find(".explanation");
    if (explanationEl.length > 0) {
      explanation = explanationEl.html() || null;
    }
    
    tests.push({ input, output, explanation });
  });

  return tests;
}

/**
 * Extracts test case lines from a <pre> element.
 * 
 * Codeforces can format sample test data in two ways:
 * 1. New style: <div class="test-example-line"> per line — extract text from each, join with \n
 * 2. Old style: plain text inside <pre> — use textContent directly
 */
function extractTestLines(
  $: cheerio.CheerioAPI,
  preElement: cheerio.Cheerio<AnyNode>
): string {
  if (preElement.length === 0) {
    return "";
  }
  
  // Check if there are .test-example-line divs inside
  const exampleLines = preElement.find("div.test-example-line");
  
  if (exampleLines.length > 0) {
    // New style: extract text from each .test-example-line and join with \n
    const lines: string[] = [];
    exampleLines.each((_i: number, lineEl: AnyNode) => {
      const line = $(lineEl).text();
      lines.push(line);
    });
    return lines.join("\n");
  }
  
  // Old style: grab the text directly from <pre>
  return preElement.text();
}

/**
 * Extracts tags from the page.
 */
function extractTags($: cheerio.CheerioAPI): string[] {
  const tags: string[] = [];
  
  const tagSelectors = [
    ".tag-box a",
    ".problem-tags a",
    ".tags a",
    ".sidebar .tag-box a",
  ];
  
  for (const selector of tagSelectors) {
    $(selector).each((_i: number, el: any) => {
      const tagText = $(el).text().trim();
      if (tagText && tagText !== '*' && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });
    
    if (tags.length > 0) break;
  }
  
  if (tags.length === 0) {
    $(".roundbox").each((_i: number, box: any) => {
      const boxText = $(box).text();
      if (boxText.includes("Tags")) {
        $(box).find("a").each((_j: number, a: any) => {
          const tagText = $(a).text().trim();
          if (tagText && tagText !== '*' && !tags.includes(tagText)) {
            tags.push(tagText);
          }
        });
      }
    });
  }
  
  return tags;
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
      break;
    }
  }
  
  return problems;
}