/**
 * ================================================================
 * Test Scraper - Contest 2227
 * ================================================================
 * 
 * This script scrapes all problems from Codeforces contest 2227
 * and saves them to the database.
 * 
 * Usage:
 *   npx tsx src/scraper/test-scraper.ts
 * 
 * ================================================================
 */

import { scrapeContestProblems } from "./codeforcesScraper.ts";
import { pool } from "../app.ts";

const CONTEST_ID = "2227";

interface ScrapedProblem {
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
 * Saves a problem to the database with its tags and sample testcases
 */
async function saveProblemToDatabase(problem: ScrapedProblem): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Insert or update the problem
    const problemQuery = `
      INSERT INTO problems (
        problem_id, contest_id, problem_index, source, title,
        statement, input_specification, output_specification,
        constraints, notes, time_limit_ms, memory_limit_mb, rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (problem_id) 
      DO UPDATE SET
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
      problem.problemId,
      problem.contestId ? parseInt(problem.contestId) : null,
      problem.problemIndex,
      'Codeforces',
      problem.title,
      problem.statement,
      problem.inputSpecification,
      problem.outputSpecification,
      problem.constraints,
      problem.notes,
      problem.timeLimit,
      problem.memoryLimit,
      problem.rating,
    ]);
    
    const problemId = problemResult.rows[0].id;
    console.log(`  ✓ Saved problem: ${problem.problemId} - ${problem.title} (DB ID: ${problemId})`);
    
    // 2. Save tags
    for (const tagName of problem.tags) {
      // Insert tag if not exists
      const tagResult = await client.query(
        'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id',
        [tagName]
      );
      
      let tagId: number;
      if (tagResult.rows.length > 0) {
        tagId = tagResult.rows[0].id;
      } else {
        // Tag already exists, fetch it
        const existingTag = await client.query('SELECT id FROM tags WHERE name = $1', [tagName]);
        tagId = existingTag.rows[0].id;
      }
      
      // Link tag to problem
      await client.query(
        'INSERT INTO problem_tags (problem_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [problemId, tagId]
      );
    }
    console.log(`  ✓ Saved ${problem.tags.length} tags`);
    
    // 3. Save sample testcases
    // First, delete existing testcases for this problem (to handle updates)
    await client.query('DELETE FROM sample_testcases WHERE problem_id = $1', [problemId]);
    
    for (let i = 0; i < problem.sampleTests.length; i++) {
      const test = problem.sampleTests[i];
      await client.query(
        'INSERT INTO sample_testcases (problem_id, testcase_order, input, output, explanation) VALUES ($1, $2, $3, $4, $5)',
        [problemId, i + 1, test.input, test.output, test.explanation]
      );
    }
    console.log(`  ✓ Saved ${problem.sampleTests.length} sample testcases`);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main function to scrape contest 2227
 */
async function main() {
  console.log(`\n🚀 Starting scraper for Codeforces Contest ${CONTEST_ID}...\n`);
  
  try {
    // Scrape all problems from the contest
    console.log(`📡 Fetching problems from Codeforces...`);
    const problems = await scrapeContestProblems(CONTEST_ID);
    
    console.log(`\n✅ Found ${problems.length} problems\n`);
    
    if (problems.length === 0) {
      console.log("⚠️  No problems found. The contest might not exist or has no problems.");
      return;
    }
    
    // Save each problem to the database
    console.log(`💾 Saving problems to database...\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const problem of problems) {
      try {
        await saveProblemToDatabase(problem);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to save problem ${problem.problemId}:`, error);
        failCount++;
      }
    }
    
    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Scraping Summary:`);
    console.log(`  Total problems found: ${problems.length}`);
    console.log(`  Successfully saved:   ${successCount}`);
    console.log(`  Failed:               ${failCount}`);
    console.log(`${'='.repeat(50)}\n`);
    
    if (successCount > 0) {
      console.log("🎉 Scraping completed successfully!");
      console.log("\nYou can now view the problems at: http://localhost:3000/api/problems");
    }
    
  } catch (error) {
    console.error("\n❌ Fatal error during scraping:", error);
    process.exit(1);
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the script
main();