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

export async function scrapeCodeforcesProblem(
  contestId: string,
  problemIndex: string
): Promise<CodeforcesProblem> {
  const url = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    const $ = cheerio.load(response.data);
    const statementElement = $(".problem-statement").first();
    
    if (statementElement.length === 0) {
        throw new Error("Could not find .problem-statement. Cloudflare might have blocked the request.");
    }

    const title = statementElement.find(".header .title").text().trim();
    
    const limitsText = statementElement.find(".header .time-limit").text();
    const timeLimitMatch = limitsText.match(/(\d+)\s*ms/);
    const timeLimit = timeLimitMatch ? parseInt(timeLimitMatch[1]) : 2000;
    
    const memoryMatch = limitsText.match(/(\d+)\s*MB/);
    const memoryLimit = memoryMatch ? parseInt(memoryMatch[1]) : 256;

    const statement = extractStatement($, statementElement);
    const inputSpecification = extractSectionContent($, statementElement, "input");
    const outputSpecification = extractSectionContent($, statementElement, "output");
    const notes = extractSectionContent($, statementElement, "note");
    const sampleTests = extractSampleTests($, statementElement);
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
  } catch (error: any) {
    if (error.response && error.response.status === 403) {
        throw new Error(`Cloudflare blocked the Axios request (403 Forbidden) for ${url}`);
    }
    throw error;
  }
}

function extractStatement(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>
): string {
  const children = container.children();
  const statementBlocks: string[] = [];
  
  children.each((_i: number, el: AnyNode) => {
    const $el = $(el);
    const tagName = ($el.prop("tagName") || "").toLowerCase();
    
    if (tagName !== "div") return;
    
    const cls = $el.attr("class") || "";
    
    // Skip these sections to isolate the raw statement
    if (cls.includes("header") || 
        cls.includes("input-specification") || 
        cls.includes("output-specification") || 
        cls.includes("sample-statement") || 
        cls.includes("sample-test") || 
        cls.includes("note")) {
      return;
    }
    
    const html = $el.html() || "";
    if (html.trim()) {
      statementBlocks.push(html);
    }
  });
  
  return statementBlocks.join("");
}

function extractSectionContent(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>,
  sectionType: "input" | "output" | "note"
): string {
  let selector = "";
  switch (sectionType) {
    case "input": selector = ".input-specification"; break;
    case "output": selector = ".output-specification"; break;
    case "note": selector = ".note"; break;
  }

  const section = container.find(selector);
  return section.length === 0 ? "" : (section.html() || "");
}

export function extractSampleTests(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<AnyNode>
): Array<{ input: string; output: string; explanation: string | null }> {
  const tests: Array<{ input: string; output: string; explanation: string | null }> = [];
  
  const inputs = container.find(".sample-test .input");
  const outputs = container.find(".sample-test .output");
  
  const count = Math.min(inputs.length, outputs.length);
  
  for (let i = 0; i < count; i++) {
    const input = extractTestLines($, $(inputs[i]).find("pre"));
    const output = extractTestLines($, $(outputs[i]).find("pre"));
    
    tests.push({ input, output, explanation: null });
  }
  
  const explanationEl = container.find(".sample-test .explanation");
  if (explanationEl.length > 0 && tests.length > 0) {
    tests[tests.length - 1].explanation = explanationEl.html() || null;
  }
  
  return tests;
}

function extractTestLines(
  $: cheerio.CheerioAPI,
  preElement: cheerio.Cheerio<AnyNode>
): string {
  if (preElement.length === 0) return "";
  
  const exampleLines = preElement.find("div.test-example-line");
  if (exampleLines.length > 0) {
    const lines: string[] = [];
    exampleLines.each((_i: number, lineEl: AnyNode) => {
      lines.push($(lineEl).text());
    });
    return lines.join("\n");
  }
  
  return preElement.text();
}

function extractTags($: cheerio.CheerioAPI): string[] {
  const tags: string[] = [];
  const tagSelectors = [".tag-box a", ".problem-tags a", ".tags a", ".sidebar .tag-box a"];
  
  for (const selector of tagSelectors) {
    $(selector).each((_i: number, el: any) => {
      const tagText = $(el).text().trim();
      if (tagText && tagText !== '*' && !tags.includes(tagText)) tags.push(tagText);
    });
    if (tags.length > 0) break;
  }
  
  return tags;
}

export async function scrapeContestProblems(contestId: string): Promise<CodeforcesProblem[]> {
  const problems: CodeforcesProblem[] = [];
  const problemIndices = ["A", "B", "C"]; // Shortened for testing
  
  for (const index of problemIndices) {
    try {
      console.log(`Scraping ${contestId}${index}...`);
      const problem = await scrapeCodeforcesProblem(contestId, index);
      problems.push(problem);
    } catch (error: any) {
      console.error(`Failed to scrape ${contestId}${index}:`, error.message);
      break;
    }
  }
  
  return problems;
}

// ================================================================
// EXECUTION BLOCK: Run directly with: npx tsx src/scraper/codeforcesScraper.ts
// ================================================================
const isMainModule = process.argv[1] && 
  (import.meta.url === `file://${process.argv[1]}` || 
   import.meta.url.endsWith(process.argv[1]?.split("/").pop() ?? ""));

if (isMainModule) {
  (async () => {
    console.log("Starting scraper test...");
    // Let's test it on a recent contest (e.g., 1900)
    const contestId = "1900"; 
    
    try {
      const problems = await scrapeContestProblems(contestId);
      console.log(`\nSuccessfully scraped ${problems.length} problems!`);
      
      if (problems.length > 0) {
        console.log("\nSample of Problem A:");
        console.log(`Title: ${problems[0].title}`);
        console.log(`Tags: ${problems[0].tags.join(", ")}`);
        console.log(`Sample Tests Found: ${problems[0].sampleTests.length}`);
      }
    } catch (err) {
      console.error("Scraper failed:", err);
    }
  })();
}
