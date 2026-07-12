import { pool } from "../app.ts";

async function deleteProblems() {
  const contestId = "2227";
  
  try {
    console.log("Deleting problems from contest " + contestId + "...\n");
    
    const findQuery = 'SELECT id, problem_id, title FROM problems WHERE contest_id = $1';
    const result = await pool.query(findQuery, [parseInt(contestId)]);
    
    if (result.rows.length === 0) {
      console.log("No problems found for this contest.");
      return;
    }
    
    console.log("Found " + result.rows.length + " problems to delete:\n");
    result.rows.forEach((row: any) => {
      console.log("  - " + row.problem_id + ": " + row.title);
    });
    
    const deleteQuery = 'DELETE FROM problems WHERE contest_id = $1';
    const deleteResult = await pool.query(deleteQuery, [parseInt(contestId)]);
    
    console.log("\nDeleted " + deleteResult.rowCount + " problems successfully!\n");
    
  } catch (error) {
    console.error("Error deleting problems:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deleteProblems();