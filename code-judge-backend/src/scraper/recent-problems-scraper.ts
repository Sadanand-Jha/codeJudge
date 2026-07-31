/**
 * ================================================================
 * Robust Codeforces Problem Scraper
 * ================================================================
 * 
 * Fetches recent problems and scrapes their HTML statements.
 * Features:
 * - Playwright Stealth Mode (bypasses Cloudflare)
 * - IP Rotation / Proxies
 * - Round-robin Account Switching
 * - Human-like mouse movements and scrolling
 * - Fixed HTML parsing for statements and testcases
 * 
 * Usage: npx tsx src/scraper/robust-problem-scraper.ts
 * ================================================================
 */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { pool } from "../app.js"; // Adjust path to your DB pool
import * as dotenv from "dotenv";

dotenv.config();
chromium.use(stealth());

// ==========================================
// CONFIGURATION
// ==========================================
const MAX_RATING = 2100;
const MAX_PROBLEMS = 50;

// Round-robin account configuration
const NUM_ACCOUNTS = 1; // Increase if you have multiple sets of cookies in .env
let CURRENT_ACCOUNT_INDEX = 0;

// IP ROTATION / PROXY CONFIGURATION
// Format: "http://username:password@ip:port" or "http://ip:port"
const PROXIES: string[] = [
  // "http://user1:pass1@proxy1.example.com:8080",
];

// ==========================================
// INTERFACES
// ==========================================
interface CfApiProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}

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
  sampleTests: Array<{ input: string; output: string; explanation: string | null }>;
  timeLimit: number;
  memoryLimit: number;
  rating: number | null;
  tags: string[];
}

// ==========================================
// CORE FUNCTIONS
// ==========================================

function getAccountCookies(accountIndex: number) {
  const suffix = accountIndex === 0 ? "" : `_${accountIndex}`;
  return {
    JSESSIONID: process.env[`CF_JSESSIONID${suffix}`] || process.env.CF_JSESSIONID || "",
    "39ce7": process.env[`CF_39CE7${suffix}`] || process.env.CF_39CE7 || "",
    cf_clearance: process.env[`CF_CLEARANCE${suffix}`] || process.env.CF_CLEARANCE || "",
  };
}

async function simulateHumanBehavior(page: any) {
  console.log("      🤖 Simulating human interactions (mouse movement & scrolling)...");
  
  // 1. Random Mouse Movements
  for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
    const x = 100 + Math.floor(Math.random() * 700);
    const y = 100 + Math.floor(Math.random() * 500);
    await page.mouse.move(x, y, { steps: 5 + Math.floor(Math.random() * 10) });
    await page.waitForTimeout(100 + Math.random() * 300);
  }
  
  // 2. Random Scrolling
  await page.mouse.wheel(0, 200 + Math.floor(Math.random() * 400));
  await page.waitForTimeout(500 + Math.random() * 700);
  
  // Scroll back up slightly
  await page.mouse.wheel(0, -(100 + Math.floor(Math.random() * 200)));
  await page.waitForTimeout(200 + Math.random() * 300);
}

async function fetchRecentProblems(maxRating: number, limit: number): Promise<CfApiProblem[]> {
  console.log("📡 Fetching problem list from Codeforces API...");
  const response = await fetch("https://codeforces.com/api/problemset.problems", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; byteclash/1.0)" },
  });

  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  const data = await response.json();
  if (data.status !== "OK") throw new Error(`API returned status: ${data.status}`);

  console.log(`  ✅ Received ${data.result.problems.length} total problems`);

  const filtered = data.result.problems.filter((p: any) => p.rating !== undefined && p.rating <= maxRating);
  const sorted = filtered.sort((a: any, b: any) => {
    if (b.contestId !== a.contestId) return b.contestId - a.contestId;
    return a.index.localeCompare(b.index);
  });

  return sorted.slice(0, limit);
}

async function scrapeProblemWithPlaywright(
  contestId: string,
  problemIndex: string
): Promise<CodeforcesProblem> {
  const url = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
  const browser = await chromium.launch({
    headless: true, // Set to false if you want to watch it work
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  let success = false;
  let accountAttempts = 0;
  let problemData: CodeforcesProblem | null = null;

  try {
    while (!success && accountAttempts < NUM_ACCOUNTS) {
      const accountIdx = CURRENT_ACCOUNT_INDEX % NUM_ACCOUNTS;
      
      const proxyConfig = PROXIES.length > 0 ? { server: PROXIES[CURRENT_ACCOUNT_INDEX % PROXIES.length] } : undefined;
      
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        viewport: { width: 1200 + Math.floor(Math.random() * 700), height: 800 + Math.floor(Math.random() * 280) },
        locale: "en-US",
        timezoneId: "America/New_York",
        proxy: proxyConfig,
      });

      try {
        const page = await context.newPage();
        console.log(`    🌐 Account ${accountIdx + 1} (Proxy: ${proxyConfig ? 'Enabled' : 'None'}) -> ${url}`);

        const cookies = getAccountCookies(accountIdx);
        const cookieList = [];
        if (cookies.JSESSIONID) cookieList.push({ name: "JSESSIONID", value: cookies.JSESSIONID, domain: ".codeforces.com", path: "/" });
        if (cookies["39ce7"]) cookieList.push({ name: "39ce7", value: cookies["39ce7"], domain: ".codeforces.com", path: "/" });
        if (cookies.cf_clearance) cookieList.push({ name: "cf_clearance", value: cookies.cf_clearance, domain: ".codeforces.com", path: "/" });

        if (cookieList.length > 0) {
            await context.addCookies(cookieList);
        } else {
            console.log("    ⚠️ No cookies found for this account. Will likely face Cloudflare.");
        }

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(2000); // Let CF initiate

        try {
            await page.waitForSelector(".problem-statement", { timeout: 35000 });
            await simulateHumanBehavior(page); // Act human before ripping DOM
            console.log("    ✅ Cloudflare passed / Page loaded");
            
            const html = await page.content();
            const $ = cheerio.load(html);
            problemData = parseProblemHtml($, contestId, problemIndex);
            
            success = true;
            CURRENT_ACCOUNT_INDEX++;
        } catch (e) {
            console.log("    ⏳ Timeout waiting for problem statement (Cloudflare blocked). Rotating...");
            CURRENT_ACCOUNT_INDEX++;
            accountAttempts++;
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (!success || !problemData) {
      throw new Error("Failed to bypass Cloudflare after all account attempts.");
  }

  return problemData;
}

// ==========================================
// PARSING LOGIC (WITH PREVIOUS FIXES)
// ==========================================
function parseProblemHtml($: cheerio.CheerioAPI, contestId: string, problemIndex: string): CodeforcesProblem {
  const statementElement = $(".problem-statement").first();
  const title = statementElement.find(".header .title").text().trim();

  const limitsText = statementElement.find(".header .time-limit").text();
  const timeLimitMatch = limitsText.match(/(\d+)\s*ms/);
  const timeLimit = timeLimitMatch ? parseInt(timeLimitMatch[1]) : 2000;
  const memoryMatch = limitsText.match(/(\d+)\s*MB/);
  const memoryLimit = memoryMatch ? parseInt(memoryMatch[1]) : 256;

  const statement = extractStatement($, statementElement);
  const inputSpecification = extractSectionContent($, statementElement, ".input-specification");
  const outputSpecification = extractSectionContent($, statementElement, ".output-specification");
  const notes = extractSectionContent($, statementElement, ".note");
  const sampleTests = extractSampleTests($, statementElement);

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
    tags: [], // Tags pulled from API later
  };
}

function extractStatement($: cheerio.CheerioAPI, container: cheerio.Cheerio<AnyNode>): string {
  const children = container.children();
  const statementBlocks: string[] = [];

  children.each((_i: number, el: AnyNode) => {
    const $el = $(el);
    const tagName = ($el.prop("tagName") || "").toLowerCase();
    if (tagName !== "div") return;

    const cls = $el.attr("class") || "";
    if (cls.includes("header") || cls.includes("input-specification") || 
        cls.includes("output-specification") || cls.includes("sample-statement") || 
        cls.includes("sample-test") || cls.includes("note")) {
      return;
    }

    const html = $el.html() || "";
    if (html.trim()) statementBlocks.push(html);
  });

  return statementBlocks.join("");
}

function extractSectionContent($: cheerio.CheerioAPI, container: cheerio.Cheerio<AnyNode>, selector: string): string {
  const section = container.find(selector);
  return section.length === 0 ? "" : (section.html() || "");
}

function extractSampleTests($: cheerio.CheerioAPI, container: cheerio.Cheerio<AnyNode>) {
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

function extractTestLines($: cheerio.CheerioAPI, preElement: cheerio.Cheerio<AnyNode>): string {
  if (preElement.length === 0) return "";
  const exampleLines = preElement.find("div.test-example-line");
  if (exampleLines.length > 0) {
    const lines: string[] = [];
    exampleLines.each((_i: number, lineEl: any) => {
  lines.push($(lineEl).text());
});
    return lines.join("\n");
  }
  return preElement.text();
}

// ==========================================
// DATABASE LOGIC (WITH PREVIOUS FIXES)
// ==========================================
async function saveProblemToDatabase(problem: CodeforcesProblem): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Safely parse contest ID to prevent NaN crash
    const parsedContestId = problem.contestId && !isNaN(Number(problem.contestId)) 
        ? parseInt(problem.contestId, 10) 
        : null;

    const problemQuery = `
      INSERT INTO problems (
        problem_id, contest_id, problem_index, source, title,
        statement, input_specification, output_specification,
        constraints, notes, time_limit_ms, memory_limit_mb, rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (problem_id) DO UPDATE SET
        title = EXCLUDED.title,
        statement = EXCLUDED.statement,
        input_specification = EXCLUDED.input_specification,
        output_specification = EXCLUDED.output_specification,
        constraints = EXCLUDED.constraints,
        notes = EXCLUDED.notes,
        time_limit_ms = EXCLUDED.time_limit_ms,
        memory_limit_mb = EXCLUDED.memory_limit_mb,
        rating = EXCLUDED.rating,
        updated_at = NOW()
      RETURNING id
    `;

    const problemResult = await client.query(problemQuery, [
      problem.problemId, parsedContestId, problem.problemIndex, "Codeforces", problem.title,
      problem.statement, problem.inputSpecification, problem.outputSpecification,
      problem.constraints, problem.notes, problem.timeLimit, problem.memoryLimit, problem.rating,
    ]);
    const problemId = problemResult.rows[0].id;

    for (const tagName of problem.tags) {
      let tagResult = await client.query("INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id", [tagName]);
      let tagId = tagResult.rows.length > 0 ? tagResult.rows[0].id : (await client.query("SELECT id FROM tags WHERE name = $1", [tagName])).rows[0].id;
      await client.query("INSERT INTO problem_tags (problem_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [problemId, tagId]);
    }

    await client.query("DELETE FROM sample_testcases WHERE problem_id = $1", [problemId]);
    for (let i = 0; i < problem.sampleTests.length; i++) {
      const test = problem.sampleTests[i];
      await client.query(
        "INSERT INTO sample_testcases (problem_id, testcase_order, input, output, explanation) VALUES ($1, $2, $3, $4, $5)",
        [problemId, i + 1, test.input, test.output, test.explanation]
      );
    }
    await client.query("COMMIT");
    console.log(`  💾 Saved to DB: ${problem.problemId}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// MAIN RUNNER
// ==========================================
async function main() {
  console.log(`\n${"=".repeat(60)}\n🚀 Codeforces Stealth Scraper\n${"=".repeat(60)}\n`);
  
  try {
    const recentProblems = await fetchRecentProblems(MAX_RATING, MAX_PROBLEMS);
    if (recentProblems.length === 0) return console.log("⚠️ No problems found.");

    let successCount = 0; let failCount = 0;

    for (let i = 0; i < recentProblems.length; i++) {
      const p = recentProblems[i];
      console.log(`\n[${i + 1}/${recentProblems.length}] Scraping ${p.contestId}${p.index}: ${p.name}`);

      try {
        const detailedProblem = await scrapeProblemWithPlaywright(String(p.contestId), p.index);
        
        // Merge API reliable data (Tags and Rating) into scraped HTML data
        detailedProblem.rating = p.rating ?? null;
        detailedProblem.tags = p.tags && p.tags.length > 0 ? p.tags : [];

        await saveProblemToDatabase(detailedProblem);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed: ${p.contestId}${p.index} - ${error}`);
        failCount++;
      }

      if (i < recentProblems.length - 1) {
        const delay = 3000 + Math.random() * 4000;
        console.log(`    ⏳ Sleeping ${Math.round(delay / 1000)}s before next request...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    console.log(`\n${"=".repeat(60)}\n📊 Summary: Attempted: ${recentProblems.length} | Saved: ${successCount} | Failed: ${failCount}\n${"=".repeat(60)}\n`);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
  } finally {
    await pool.end();
  }
}

main();