import { pool } from "../config/database.ts";

export interface Envelope {
  v: 1;
  alg: "A256GCM";
  iv: string;
  ct: string;
}

export interface KekConfig {
  salt: string;
  kdf: { algorithm: "PBKDF2-HMAC-SHA-256"; iterations: number };
  check: Envelope;
}

export interface SecureQuestionInput {
  problemId?: number;
  payloadAadId: string;
  payloadCt: Envelope;
  quizProblemType: number;
  questionNumber: number;
  marks?: number;
  negativeMarks?: number;
  difficulty?: number;
  options: Array<{
    id?: number;
    isCorrect: boolean;
    answerHash?: string | null;
  }>;
}

export interface SecureQuizContentInput {
  wrappedDek?: Envelope;
  problems: SecureQuestionInput[];
}

export interface SecureQuestionRow {
  problemId: number;
  payloadAadId: string;
  payloadCt: Envelope | null;
  quizProblemType: number | null;
  questionNumber: number | null;
  marks: number | null;
  negativeMarks: number | null;
  difficulty: number | null;
  options: Array<{
    id: number;
    isCorrect: boolean;
    sortOrder: number;
    answerHash: string | null;
  }>;
}

export interface SavedSecureQuestion {
  problemId: number;
  payloadAadId: string;
  options: Array<{ id: number; sortOrder: number }>;
}

export class QuizCryptoRepository {
  async getKekConfig(userId: number): Promise<KekConfig | null> {
    const result = await pool.query(
      `SELECT kek_salt, kek_kdf, kek_check
         FROM users
        WHERE id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row || !row.kek_salt || !row.kek_kdf || !row.kek_check) return null;
    return {
      salt: String(row.kek_salt),
      kdf: row.kek_kdf,
      check: row.kek_check,
    };
  }

  async saveKekConfig(userId: number, config: KekConfig): Promise<KekConfig> {
    const result = await pool.query(
      `UPDATE users
          SET kek_salt = $2,
              kek_kdf = $3::jsonb,
              kek_check = $4::jsonb,
              updatedat = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING kek_salt, kek_kdf, kek_check`,
      [
        userId,
        config.salt,
        JSON.stringify(config.kdf),
        JSON.stringify(config.check),
      ]
    );
    const row = result.rows[0];
    return {
      salt: String(row.kek_salt),
      kdf: row.kek_kdf,
      check: row.kek_check,
    };
  }

  async getQuizCryptoMeta(
    quizId: number
  ): Promise<{ cryptoVersion: number; wrappedDek: Envelope | null } | null> {
    const result = await pool.query(
      `SELECT crypto_version AS "cryptoVersion", wrapped_dek AS "wrappedDek"
         FROM quiz
        WHERE id = $1 AND deleted_at IS NULL`,
      [quizId]
    );
    return result.rows[0] ?? null;
  }

  async getSecureContent(quizId: number): Promise<SecureQuestionRow[]> {
    const problems = await pool.query(
      `SELECT id,
              payload_aad_id AS "payloadAadId",
              payload_ct AS "payloadCt",
              quiz_problem_type AS "quizProblemType",
              question_number AS "questionNumber",
              marks,
              negative_marks AS "negativeMarks",
              difficulty
         FROM quiz_problems
        WHERE quiz_id = $1 AND deleted_at IS NULL
        ORDER BY question_number ASC, id ASC`,
      [quizId]
    );
    const ids = problems.rows.map((row) => row.id);
    if (ids.length === 0) return [];
    const options = await pool.query(
      `SELECT id, problem_id AS "problemId", iscorrect AS "isCorrect",
              sort_order AS "sortOrder", answer_hash AS "answerHash"
         FROM quiz_problem_options
        WHERE problem_id = ANY($1::int[])
        ORDER BY sort_order ASC, id ASC`,
      [ids]
    );
    const optionsByProblem = new Map<number, SecureQuestionRow["options"]>();
    for (const option of options.rows) {
      const list = optionsByProblem.get(Number(option.problemId)) ?? [];
      list.push({
        id: Number(option.id),
        isCorrect: option.isCorrect === true,
        sortOrder: Number(option.sortOrder) || 0,
        answerHash: option.answerHash ?? null,
      });
      optionsByProblem.set(Number(option.problemId), list);
    }
    return problems.rows.map((row) => ({
      problemId: Number(row.id),
      payloadAadId: String(row.payloadAadId ?? ""),
      payloadCt: row.payloadCt ?? null,
      quizProblemType: row.quizProblemType ?? null,
      questionNumber: row.questionNumber ?? null,
      marks: row.marks ?? null,
      negativeMarks: row.negativeMarks ?? null,
      difficulty: row.difficulty ?? null,
      options: optionsByProblem.get(Number(row.id)) ?? [],
    }));
  }

  async replaceSecureContent(
    quizId: number,
    createdBy: number,
    input: SecureQuizContentInput
  ): Promise<{ cryptoVersion: number; problems: SavedSecureQuestion[] }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [quizId]);

      if (input.wrappedDek) {
        await client.query(
          `UPDATE quiz
              SET crypto_version = 1,
                  wrapped_dek = $2::jsonb,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL`,
          [quizId, JSON.stringify(input.wrappedDek)]
        );
      } else {
        await client.query(
          `UPDATE quiz
              SET crypto_version = 1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
              AND crypto_version = 1`,
          [quizId]
        );
      }

      const keptIds: number[] = [];
      const saved: SavedSecureQuestion[] = [];

      for (const problem of input.problems) {
        let problemId = problem.problemId;
        if (problemId) {
          const owned = await client.query(
            `SELECT id FROM quiz_problems
              WHERE id = $1 AND quiz_id = $2 AND deleted_at IS NULL`,
            [problemId, quizId]
          );
          if (owned.rows.length === 0) {
            throw new Error("Question does not belong to this quiz");
          }
          await client.query(
            `UPDATE quiz_problems
                SET problem_statement = NULL,
                    problem_description = NULL,
                    explaination = NULL,
                    hint = NULL,
                    reference_notes = NULL,
                    internal_comments = NULL,
                    quiz_problem_type = $3,
                    question_number = $4,
                    marks = $5,
                    negative_marks = $6,
                    difficulty = $7,
                    payload_ct = $8::jsonb,
                    payload_aad_id = $9,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = $1 AND quiz_id = $2`,
            [
              problemId,
              quizId,
              problem.quizProblemType,
              problem.questionNumber,
              problem.marks ?? null,
              problem.negativeMarks ?? null,
              problem.difficulty ?? null,
              JSON.stringify(problem.payloadCt),
              problem.payloadAadId,
            ]
          );
        } else {
          const inserted = await client.query(
            `INSERT INTO quiz_problems (
               quiz_id, problem_statement, problem_description,
               quiz_problem_type, question_number, explaination, hint,
               difficulty, reference_notes, internal_comments, marks,
               negative_marks, payload_ct, payload_aad_id,
               created_at, updated_at
             )
             VALUES ($1, NULL, NULL, $2, $3, NULL, NULL, $4, NULL, NULL,
                     $5, $6, $7::jsonb, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id`,
            [
              quizId,
              problem.quizProblemType,
              problem.questionNumber,
              problem.difficulty ?? null,
              problem.marks ?? null,
              problem.negativeMarks ?? null,
              JSON.stringify(problem.payloadCt),
              problem.payloadAadId,
            ]
          );
          problemId = Number(inserted.rows[0].id);
        }

        keptIds.push(problemId);

        const keptOptionIds: number[] = [];
        const savedOptions: Array<{ id: number; sortOrder: number }> = [];
        for (let index = 0; index < problem.options.length; index += 1) {
          const option = problem.options[index];
          let optionId = option.id;
          if (optionId) {
            const owned = await client.query(
              `SELECT id FROM quiz_problem_options
                WHERE id = $1 AND problem_id = $2`,
              [optionId, problemId]
            );
            if (owned.rows.length === 0) optionId = undefined;
          }
          if (optionId) {
            await client.query(
              `UPDATE quiz_problem_options
                  SET option_statement = NULL,
                      option_description = NULL,
                      matching_target = NULL,
                      iscorrect = $3,
                      answer_hash = $4,
                      sort_order = $5,
                      updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND problem_id = $2`,
              [
                optionId,
                problemId,
                option.isCorrect,
                option.answerHash ?? null,
                index,
              ]
            );
          } else {
            const insertedOption = await client.query(
              `INSERT INTO quiz_problem_options (
                 problem_id, option_statement, option_description,
                 matching_target, iscorrect, answer_hash, sort_order,
                 created_at, updated_at
               )
               VALUES ($1, NULL, NULL, NULL, $2, $3, $4,
                       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING id`,
              [
                problemId,
                option.isCorrect,
                option.answerHash ?? null,
                index,
              ]
            );
            optionId = Number(insertedOption.rows[0].id);
          }
          keptOptionIds.push(optionId);
          savedOptions.push({ id: optionId, sortOrder: index });
        }

        if (keptOptionIds.length === 0) {
          await client.query(
            `DELETE FROM quiz_problem_options WHERE problem_id = $1`,
            [problemId]
          );
        } else {
          await client.query(
            `DELETE FROM quiz_problem_options
              WHERE problem_id = $1 AND id <> ALL($2::int[])`,
            [problemId, keptOptionIds]
          );
        }

        saved.push({
          problemId,
          payloadAadId: problem.payloadAadId,
          options: savedOptions,
        });
      }

      if (keptIds.length === 0) {
        await client.query(
          `UPDATE quiz_problems
              SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
            WHERE quiz_id = $1 AND deleted_at IS NULL`,
          [quizId]
        );
      } else {
        await client.query(
          `UPDATE quiz_problems
              SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP
            WHERE quiz_id = $1 AND deleted_at IS NULL
              AND id <> ALL($2::int[])`,
          [quizId, keptIds]
        );
      }

      await client.query("COMMIT");
      return { cryptoVersion: 1, problems: saved };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async nullLegacyPlaintext(quizId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE quiz_problems
            SET problem_statement = NULL,
                problem_description = NULL,
                explaination = NULL,
                hint = NULL,
                reference_notes = NULL,
                internal_comments = NULL,
                updated_at = CURRENT_TIMESTAMP
          WHERE quiz_id = $1 AND deleted_at IS NULL`,
        [quizId]
      );
      await client.query(
        `UPDATE quiz_problem_options o
            SET option_statement = NULL,
                option_description = NULL,
                matching_target = NULL,
                updated_at = CURRENT_TIMESTAMP
           FROM quiz_problems p
          WHERE o.problem_id = p.id AND p.quiz_id = $1`,
        [quizId]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
