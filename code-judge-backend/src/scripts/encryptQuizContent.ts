// Encrypt existing plaintext quiz runtime questions in place.
//
//   npm run encrypt:quiz-content            # encrypt all quiz problems/options
//   npm run encrypt:quiz-content -- --dry-run
//
// The script is idempotent: encrypted values are detected by their version
// prefix and skipped, so it is safe to re-run after an interrupted backfill.
// Question banks and saved test papers are intentionally out of scope.
import "dotenv/config";
import { pool } from "../config/database.ts";
import {
  encryptOptionRow,
  encryptProblemRow,
  isEncryptedValue,
} from "../services/quizContentCrypto.service.ts";

const dryRun = process.argv.includes("--dry-run");
const batchSize = Number((process.argv.find((arg) => arg.startsWith("--batch-size=")) ?? "").split("=")[1]) || 200;

const OPTION_FIELDS = ["option_statement", "option_description", "matching_target"] as const;
const PROBLEM_FIELDS = [
  "problem_statement",
  "problem_description",
  "explaination",
  "hint",
  "reference_notes",
  "internal_comments",
] as const;

function needsTextEncryption(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 && !isEncryptedValue(value);
}

async function processQuizProblems(): Promise<number> {
  let updated = 0;
  let lastId = 0;
  for (;;) {
    const { rows } = await pool.query(
      `SELECT id, ${PROBLEM_FIELDS.join(", ")}
         FROM quiz_problems
        WHERE id > $1
        ORDER BY id
        LIMIT $2`,
      [lastId, batchSize]
    );
    if (rows.length === 0) break;
    lastId = Number(rows[rows.length - 1].id);

    for (const row of rows) {
      const hasPlaintext = PROBLEM_FIELDS.some((field) => needsTextEncryption(row[field]));
      if (!hasPlaintext) continue;
      const encrypted = encryptProblemRow(row);
      if (!dryRun) {
        await pool.query(
          `UPDATE quiz_problems
              SET ${PROBLEM_FIELDS.map((field, index) => `${field} = $${index + 2}`).join(", ")},
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [row.id, ...PROBLEM_FIELDS.map((field) => encrypted[field])]
        );
      }
      updated += 1;
    }
  }
  return updated;
}

async function processQuizOptions(): Promise<number> {
  let updated = 0;
  let lastId = 0;
  for (;;) {
    const { rows } = await pool.query(
      `SELECT id, ${OPTION_FIELDS.join(", ")}
         FROM quiz_problem_options
        WHERE id > $1
        ORDER BY id
        LIMIT $2`,
      [lastId, batchSize]
    );
    if (rows.length === 0) break;
    lastId = Number(rows[rows.length - 1].id);

    for (const row of rows) {
      const hasPlaintext = OPTION_FIELDS.some((field) => needsTextEncryption(row[field]));
      if (!hasPlaintext) continue;
      const encrypted = encryptOptionRow(row);
      if (!dryRun) {
        await pool.query(
          `UPDATE quiz_problem_options
              SET ${OPTION_FIELDS.map((field, index) => `${field} = $${index + 2}`).join(", ")},
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [row.id, ...OPTION_FIELDS.map((field) => encrypted[field])]
        );
      }
      updated += 1;
    }
  }
  return updated;
}

async function main() {
  console.log(`[encrypt-quiz-content] starting${dryRun ? " (dry run)" : ""}`);
  const results = {
    quiz_problems: await processQuizProblems(),
    quiz_problem_options: await processQuizOptions(),
  };
  console.table(results);
  console.log(
    `[encrypt-quiz-content] ${dryRun ? "would encrypt" : "encrypted"} ${Object.values(results).reduce((sum, value) => sum + value, 0)} rows`
  );
}

main()
  .catch((error) => {
    console.error("[encrypt-quiz-content] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
