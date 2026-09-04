// Admin Quiz Repository — all data-access for the creator/admin quiz surface.
// Contains quiz CRUD, problem management, responses, analytics, game config,
// collaborators, participants, and result-generation helpers.
import { pool } from "../app.ts";

export class AdminQuizRepository {
  // ==================== SHARED LOOKUPS ====================

  async getQuizById(quizId: string): Promise<any | null> {
    const query = `
      SELECT
        q.id, q.name, q.code, q.createdby, q.starttime, q.endtime,
        q.subject_id, q.duration, q.total_marks, q.passing_marks,
        q.shuffle_questions, q.shuffle_options, q.show_results_immediately,
        q.negative_marking, q.leaderboard,
        qs.name AS status, q.created_at,
        qd.heading AS difficulty_name
      FROM quiz q
      LEFT JOIN quiz_difficulty qd ON qd.id = q.difficulty
      LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      WHERE q.id = $1
    `;
    const result = await pool.query(query, [quizId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getQuizByCode(code: string): Promise<any | null> {
    const query = `
      SELECT
        q.id, q.name, q.code, q.createdby, q.starttime, q.endtime,
        q.subject_id, q.duration, q.total_marks, q.passing_marks,
        q.shuffle_questions, q.shuffle_options, q.show_results_immediately,
        q.negative_marking, q.leaderboard,
        qs.name AS status, q.created_at,
        qd.heading AS difficulty_name
      FROM quiz q
      LEFT JOIN quiz_difficulty qd ON qd.id = q.difficulty
      LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      WHERE q.code = $1
    `;
    const result = await pool.query(query, [code]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async generateUniqueCode(): Promise<string> {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    let exists = true;
    while (exists) {
      code = "";
      for (let i = 0; i < 16; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const result = await pool.query("SELECT 1 FROM quiz WHERE code = $1 LIMIT 1", [code]);
      exists = result.rows.length > 0;
    }
    return code;
  }

  // ==================== QUIZ CRUD ====================

  async getAllQuizzes(filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    visibility?: number;
    difficulty?: number;
    sortBy?: string;
    sortOrder?: string;
    userId?: number;
  }): Promise<{ quizzes: any[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      visibility,
      difficulty,
      sortBy = "created_at",
      sortOrder = "DESC",
      userId,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      conditions.push(`(q.name ILIKE $${paramCount} OR q.code ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }
    if (status) {
      paramCount++;
      conditions.push(`qs.name = $${paramCount}`);
      queryParams.push(status);
    }
    if (visibility !== undefined) {
      paramCount++;
      conditions.push(`q.visibility = $${paramCount}`);
      queryParams.push(visibility);
    }
    if (difficulty !== undefined) {
      paramCount++;
      conditions.push(`q.difficulty = $${paramCount}`);
      queryParams.push(difficulty);
    }
    if (userId) {
      paramCount++;
      conditions.push(`q.createdby = $${paramCount}`);
      queryParams.push(userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(`SELECT COUNT(*) FROM quiz q ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const allowedSortFields = ["name", "code", "created_at", "starttime", "total_marks"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const query = `
      SELECT
        q.id, q.name, q.code, q.duration, qs.name AS status,
        COUNT(DISTINCT qr.id) AS participants,
        COUNT(DISTINCT qp.id) AS total_questions,
        COALESCE(AVG(CASE WHEN qsr.answer IS NOT NULL THEN 1 ELSE 0 END), 0) AS completion_rate
      FROM quiz q
      LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      LEFT JOIN quiz_registration qr ON qr.quiz_id = q.id AND qr.is_registered = true
      LEFT JOIN quiz_problems qp ON qp.quiz_id = q.id
      LEFT JOIN quiz_attempt qa_attempt ON qa_attempt.quiz_id = q.id AND qa_attempt.user_id = qr.user_id
      LEFT JOIN quiz_student_response qsr ON qsr.attempt_id = qa_attempt.id AND qsr.problem_id = qp.id
      ${whereClause}
      GROUP BY q.id, qs.name
      ORDER BY q.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;
    const result = await pool.query(query, queryParams);
    return { quizzes: result.rows, total };
  }

  async createQuiz(data: {
    name: string; code: string; createdby: number; starttime?: Date;
    visibility?: number; difficulty?: number; subjectId?: number; examId?: number;
    duration?: number; totalMarks?: number; passingMarks?: number;
    shuffleQuestions?: boolean; shuffleOptions?: boolean;
    showResultsImmediately?: boolean; negativeMarking?: boolean;
    leaderboard?: boolean; status?: string;
  }): Promise<any> {
    let statusId: number | null = null;
    if (data.status) {
      const statusResult = await pool.query(
        "SELECT id FROM quiz_status WHERE LOWER(name) = LOWER($1) LIMIT 1", [data.status]
      );
      statusId = statusResult.rows.length > 0 ? statusResult.rows[0].id : null;
    }

    const query = `
      INSERT INTO quiz (
        name, code, createdby, starttime, visibility, difficulty,
        subject_id, exam_cat, duration, total_marks, passing_marks,
        shuffle_questions, shuffle_options, show_results_immediately,
        negative_marking, leaderboard, quiz_status, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.name, data.code, data.createdby, data.starttime || null,
      data.visibility || null, data.difficulty || null, data.subjectId || null,
      data.examId || null, data.duration || null, data.totalMarks || 0,
      data.passingMarks || 0, data.shuffleQuestions || false, data.shuffleOptions || false,
      data.showResultsImmediately || false, data.negativeMarking || false,
      data.leaderboard !== false, statusId,
    ]);
    return result.rows[0];
  }

  async updateQuiz(quizId: number, data: any): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.status) {
      const statusResult = await pool.query(
        "SELECT id FROM quiz_status WHERE LOWER(name) = LOWER($1) LIMIT 1", [data.status]
      );
      if (statusResult.rows.length > 0) {
        data.quiz_status = statusResult.rows[0].id;
      }
      delete data.status;
    }

    const updateableFields = [
      "name", "starttime", "endtime", "visibility", "difficulty",
      "subject_id", "exam_cat", "duration", "total_marks", "passing_marks",
      "shuffle_questions", "shuffle_options", "show_results_immediately",
      "negative_marking", "leaderboard", "quiz_status",
    ];
    const fieldKeyMap: Record<string, string> = {
      status: "quiz_status", subjectId: "subject_id", examId: "exam_cat",
      timeLimit: "duration", totalQuestions: "total_marks",
      shuffleQuestions: "shuffle_questions", shuffleOptions: "shuffle_options",
      showResultsImmediately: "show_results_immediately", negativeMarking: "negative_marking",
      passingMarks: "passing_marks", passingPercentage: "passing_marks",
    };

    for (const field of updateableFields) {
      const camelKey = Object.keys(fieldKeyMap).find((k) => fieldKeyMap[k] === field);
      const val = data[field] ?? (camelKey ? data[camelKey] : undefined);
      if (val !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(val);
      }
    }
    if (fields.length === 0) return null;

    paramCount++;
    values.push(quizId);
    const result = await pool.query(
      `UPDATE quiz SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteQuiz(quizId: number): Promise<boolean> {
    const result = await pool.query("DELETE FROM quiz WHERE id = $1", [quizId]);
    return (result.rowCount ?? 0) > 0;
  }

  async cloneQuiz(quizId: number, newName: string, newCode: string, createdBy: number): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const originalQuiz = await client.query("SELECT * FROM quiz WHERE id = $1", [quizId]);
      if (!originalQuiz.rows.length) throw new Error("Quiz not found");
      const original = originalQuiz.rows[0];

      const statusResult = await client.query(
        "SELECT id FROM quiz_status WHERE LOWER(name) = 'draft' LIMIT 1"
      );
      const draftStatusId = statusResult.rows.length > 0 ? statusResult.rows[0].id : 1;

      const newQuiz = await client.query(
        `INSERT INTO quiz (name, code, createdby, starttime, endtime, visibility, difficulty,
         total_marks, passing_marks, shuffle_questions, shuffle_options, show_results_immediately,
         negative_marking, leaderboard, quiz_status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *`,
        [newName, newCode, createdBy, original.starttime, original.endtime,
         original.visibility, original.difficulty, original.total_marks, original.passing_marks,
         original.shuffle_questions, original.shuffle_options, original.show_results_immediately,
         original.negative_marking, original.leaderboard, draftStatusId]
      );
      const newQuizId = newQuiz.rows[0].id;

      const problems = await client.query("SELECT * FROM quiz_problems WHERE quiz_id = $1", [quizId]);
      for (const problem of problems.rows) {
        const newProblem = await client.query(
          `INSERT INTO quiz_problems (quiz_id, problem_statement, problem_description, quiz_problem_type,
           question_number, explaination, hint, difficulty, reference_notes, internal_comments, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
          [newQuizId, problem.problem_statement, problem.problem_description, problem.quiz_problem_type,
           problem.question_number, problem.explaination, problem.hint, problem.difficulty,
           problem.reference_notes, problem.internal_comments]
        );
        const newProblemId = newProblem.rows[0].id;
        const options = await client.query("SELECT * FROM quiz_problem_options WHERE problem_id = $1", [problem.id]);
        for (const option of options.rows) {
          await client.query(
            `INSERT INTO quiz_problem_options (problem_id, option_statement, option_description, matching_target, iscorrect, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
            [newProblemId, option.option_statement, option.option_description, (option as any).matching_target ?? null, option.iscorrect]
          );
        }
      }
      await client.query("COMMIT");
      return newQuiz.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== PROBLEM MANAGEMENT ====================

  async getQuizProblems(quizId: string): Promise<any[]> {
    const query = `
      SELECT qp.id, qp.quiz_id, qp.problem_statement,
        qp.quiz_problem_type, qpt.name AS problem_type_name, qp.question_number,
        qp.explaination, qp.hint, qp.difficulty, qd.heading AS difficulty_name
      FROM quiz_problems qp
      LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
      LEFT JOIN quiz_difficulty qd ON qd.id = qp.difficulty
      WHERE qp.quiz_id = $1
      ORDER BY qp.question_number ASC, qp.id ASC
    `;
    const result = await pool.query(query, [quizId]);
    return result.rows;
  }

  async getQuizProblemById(problemId: number | string): Promise<any | null> {
    const query = `
      SELECT qp.id, qp.quiz_id, qp.problem_statement,
        qp.quiz_problem_type, qpt.name AS problem_type_name, qp.question_number,
        qp.explaination, qp.hint, qp.difficulty, qd.heading AS difficulty_name
      FROM quiz_problems qp
      LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
      LEFT JOIN quiz_difficulty qd ON qd.id = qp.difficulty
      WHERE qp.id = $1 LIMIT 1
    `;
    const result = await pool.query(query, [problemId]);
    return result.rows.length ? result.rows[0] : null;
  }

  async getQuizProblemCount(quizId: string): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM quiz_problems WHERE quiz_id = $1", [quizId]
    );
    return result.rows[0]?.count ?? 0;
  }

  async getQuizProblemOptions(problemId: string): Promise<any[]> {
    const query = `
      SELECT qpo.id, qpo.problem_id, qpo.option_statement, qpo.option_description,
        qpo.matching_target, qpo.iscorrect
      FROM quiz_problem_options qpo
      WHERE qpo.problem_id = $1
      ORDER BY qpo.id ASC
    `;
    const result = await pool.query(query, [problemId]);
    return result.rows;
  }

  async createQuizProblem(data: {
    quizId: number; problemStatement: string; problemDescription?: string;
    quizProblemType?: number; questionNumber?: number; explanation?: string;
    hint?: string; difficulty?: number; referenceNotes?: string; internalComments?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO quiz_problems (quiz_id, problem_statement, problem_description, quiz_problem_type,
        question_number, explaination, hint, difficulty, reference_notes, internal_comments, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *
    `;
    const result = await pool.query(query, [
      data.quizId, data.problemStatement, data.problemDescription || null,
      data.quizProblemType || null, data.questionNumber || 1, data.explanation || null,
      data.hint || null, data.difficulty || null, data.referenceNotes || null, data.internalComments || null,
    ]);
    return result.rows[0];
  }

  async createQuizProblemOption(data: {
    problemId: number; optionStatement: string; optionDescription?: string;
    matchingTarget?: string | null; isCorrect: boolean;
  }): Promise<any> {
    const query = `
      INSERT INTO quiz_problem_options (problem_id, option_statement, option_description, matching_target, iscorrect, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *
    `;
    const result = await pool.query(query, [
      data.problemId, data.optionStatement, data.optionDescription || null,
      (data as any).matchingTarget ?? (data as any).matching_target ?? null, data.isCorrect,
    ]);
    return result.rows[0];
  }

  async updateQuizProblem(problemId: number, data: any): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;
    const updateableFields = [
      "problem_statement", "problem_description", "quiz_problem_type", "question_number",
      "explaination", "hint", "difficulty", "reference_notes", "internal_comments",
    ];
    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(data[field]);
      }
    }
    if (fields.length === 0) return null;
    fields.push("updated_at = CURRENT_TIMESTAMP");
    paramCount++;
    values.push(problemId);
    const result = await pool.query(
      `UPDATE quiz_problems SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`, values
    );
    return result.rows[0];
  }

  async deleteQuizProblem(problemId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM quiz_problem_options WHERE problem_id = $1", [problemId]);
      await client.query("DELETE FROM quiz_student_response WHERE problem_id = $1", [problemId]);
      const result = await client.query("DELETE FROM quiz_problems WHERE id = $1", [problemId]);
      await client.query("COMMIT");
      return (result.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async duplicateQuizProblem(problemId: number): Promise<any> {
    const original = await pool.query("SELECT * FROM quiz_problems WHERE id = $1", [problemId]);
    if (!original.rows.length) return null;
    const problem = original.rows[0];

    const newProblem = await pool.query(
      `INSERT INTO quiz_problems (quiz_id, problem_statement, problem_description, quiz_problem_type,
       question_number, explaination, hint, difficulty, reference_notes, internal_comments, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *`,
      [problem.quiz_id, problem.problem_statement, problem.problem_description, problem.quiz_problem_type,
       problem.question_number + 1, problem.explaination, problem.hint, problem.difficulty,
       problem.reference_notes, problem.internal_comments]
    );
    const newProblemId = newProblem.rows[0].id;
    const options = await pool.query("SELECT * FROM quiz_problem_options WHERE problem_id = $1", [problemId]);
    for (const option of options.rows) {
      await pool.query(
        `INSERT INTO quiz_problem_options (problem_id, option_statement, option_description, matching_target, iscorrect, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [newProblemId, option.option_statement, option.option_description, (option as any).matching_target ?? null, option.iscorrect]
      );
    }
    return newProblem.rows[0];
  }

  async saveQuizProblemFull(data: {
    problemId?: number; quizId: number; problemStatement: string;
    problemDescription?: string; quizProblemType?: number; questionNumber?: number;
    explanation?: string; hint?: string; difficulty?: number;
    referenceNotes?: string; internalComments?: string;
    marks?: number; negativeMarks?: number;
    options?: Array<{
      optionStatement: string; optionDescription?: string;
      matchingTarget?: string | null; matching_target?: string | null; isCorrect: boolean;
    }>;
  }): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let problem;
      if (data.problemId) {
        const fields: string[] = [];
        const values: any[] = [];
        let pc = 0;
        const uf: Record<string, any> = {
          problem_statement: data.problemStatement,
          problem_description: data.problemDescription ?? null,
          quiz_problem_type: data.quizProblemType ?? null,
          question_number: data.questionNumber ?? null,
          explaination: data.explanation ?? null,
          hint: data.hint ?? null,
          difficulty: data.difficulty ?? null,
          reference_notes: data.referenceNotes ?? null,
          internal_comments: data.internalComments ?? null,
          marks: data.marks ?? null,
          negative_marks: data.negativeMarks ?? null,
        };
        for (const [field, value] of Object.entries(uf)) {
          if (value !== undefined) { pc++; fields.push(`${field} = $${pc}`); values.push(value); }
        }
        if (fields.length > 0) {
          pc++; fields.push("updated_at = CURRENT_TIMESTAMP"); values.push(data.problemId);
          const result = await client.query(`UPDATE quiz_problems SET ${fields.join(", ")} WHERE id = $${pc} RETURNING *`, values);
          problem = result.rows[0];
        } else {
          const result = await client.query("SELECT * FROM quiz_problems WHERE id = $1", [data.problemId]);
          problem = result.rows[0];
        }
      } else {
        const result = await client.query(
          `INSERT INTO quiz_problems (quiz_id, problem_statement, problem_description, quiz_problem_type,
           question_number, explaination, hint, difficulty, reference_notes, internal_comments,
           marks, negative_marks, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *`,
          [data.quizId, data.problemStatement, data.problemDescription || null, data.quizProblemType || null,
           data.questionNumber || 1, data.explanation || null, data.hint || null, data.difficulty || null,
           data.referenceNotes || null, data.internalComments || null, data.marks ?? null, data.negativeMarks ?? null]
        );
        problem = result.rows[0];
      }
      if (data.options && problem) {
        await client.query("DELETE FROM quiz_problem_options WHERE problem_id = $1", [problem.id]);
        for (const opt of data.options) {
          const mt = (opt as any).matchingTarget ?? (opt as any).matching_target ?? null;
          const isTargetType = data.quizProblemType === 12 || data.quizProblemType === 6;
          await client.query(
            `INSERT INTO quiz_problem_options (problem_id, option_statement, option_description, matching_target, iscorrect, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
            [problem.id, opt.optionStatement, opt.optionDescription || null, isTargetType ? mt : (mt ?? null), opt.isCorrect]
          );
        }
      }
      await client.query("COMMIT");
      return problem;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async reorderQuizProblems(quizId: number, problemIds: number[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < problemIds.length; i++) {
        await client.query(
          "UPDATE quiz_problems SET question_number = $1 WHERE id = $2 AND quiz_id = $3",
          [i + 1, problemIds[i], quizId]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== LOOKUPS ====================

  async getAllSubjects(search?: string): Promise<any[]> {
    if (search) {
      const result = await pool.query("SELECT * FROM subjects WHERE subject_name ILIKE $1", [`%${search}%`]);
      return result.rows;
    }
    const result = await pool.query("SELECT * FROM subjects ORDER BY subject_name");
    return result.rows;
  }

  async getAllExamCategories(search?: string): Promise<any[]> {
    if (search) {
      const result = await pool.query("SELECT * FROM exam_categories WHERE exam_cat ILIKE $1", [`%${search}%`]);
      return result.rows;
    }
    const result = await pool.query("SELECT * FROM exam_categories ORDER BY exam_cat");
    return result.rows;
  }

  // ==================== COLLABORATORS ====================
  // NOTE: quiz_collaborator_request table does not exist yet.
  // All collaborator methods are temporarily disabled.

  // async isAcceptedCollaborator(userId: number, quizId: number): Promise<boolean> {
  //   const result = await pool.query(
  //     "SELECT 1 FROM quiz_collaborator_request WHERE quiz_id = $1 AND user_id = $2 AND status = 'accepted' LIMIT 1",
  //     [quizId, userId]
  //   );
  //   return result.rows.length > 0;
  // }

  async resolveUserId(identifier: string): Promise<number | null> {
    const result = await pool.query(
      "SELECT id FROM users WHERE id::text = $1 OR LOWER(username) = LOWER($1) LIMIT 1", [identifier]
    );
    return result.rows.length ? Number(result.rows[0].id) : null;
  }

  async getUserContactById(userId: number): Promise<{ id: number; email: string; username: string } | null> {
    const result = await pool.query("SELECT id, email, username FROM users WHERE id = $1 LIMIT 1", [userId]);
    return result.rows.length ? result.rows[0] : null;
  }

  // async sendCollaboratorRequest(data: { quizId: number; userId: number; invitedBy: number }): Promise<any | null> {
  //   const result = await pool.query(
  //     `INSERT INTO quiz_collaborator_request (quiz_id, user_id, invited_by, status, created_at, updated_at)
  //      VALUES ($1,$2,$3,'pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
  //      ON CONFLICT (quiz_id, user_id) DO UPDATE SET status = 'pending', invited_by = $3, updated_at = CURRENT_TIMESTAMP
  //      RETURNING *`,
  //     [data.quizId, data.userId, data.invitedBy]
  //   );
  //   return result.rows[0];
  // }

  // async getCollaboratorRequests(quizId: number): Promise<any[]> {
  //   const result = await pool.query(
  //     `SELECT qcr.id, qcr.user_id, qcr.status, qcr.created_at, qcr.updated_at,
  //       u.username, u.first_name, u.last_name
  //      FROM quiz_collaborator_request qcr JOIN users u ON u.id = qcr.user_id
  //      WHERE qcr.quiz_id = $1 ORDER BY qcr.created_at DESC`,
  //     [quizId]
  //   );
  //   return result.rows;
  // }

  // async getCollaboratorRequest(quizId: number, userId: number): Promise<any | null> {
  //   const result = await pool.query(
  //     `SELECT qcr.id, qcr.quiz_id, qcr.user_id, qcr.status, qcr.created_at, qcr.updated_at
  //      FROM quiz_collaborator_request qcr
  //      WHERE qcr.quiz_id = $1 AND qcr.user_id = $2 LIMIT 1`,
  //     [quizId, userId]
  //   );
  //   return result.rows.length ? result.rows[0] : null;
  // }

  // async updateCollaboratorRequest(quizId: number, userId: number, status: "pending" | "accepted" | "rejected"): Promise<any | null> {
  //   const result = await pool.query(
  //     `UPDATE quiz_collaborator_request SET status = $3, updated_at = CURRENT_TIMESTAMP
  //      WHERE quiz_id = $1 AND user_id = $2 RETURNING *`,
  //     [quizId, userId, status]
  //   );
  //   return result.rows.length ? result.rows[0] : null;
  // }

  // async removeCollaborator(quizId: number, userId: number): Promise<boolean> {
  //   const result = await pool.query("DELETE FROM quiz_collaborator_request WHERE quiz_id = $1 AND user_id = $2", [quizId, userId]);
  //   return (result.rowCount ?? 0) > 0;
  // }

  // async getIncomingCollaboratorRequests(userId: number): Promise<any[]> {
  //   const result = await pool.query(
  //     `SELECT qcr.id, qcr.quiz_id, qcr.user_id, qcr.status, qcr.created_at, qcr.updated_at,
  //       q.name AS quiz_name, inviter.username AS inviter_username
  //      FROM quiz_collaborator_request qcr
  //      JOIN quiz q ON q.id = qcr.quiz_id
  //      JOIN users inviter ON inviter.id = qcr.invited_by
  //      WHERE qcr.user_id = $1 ORDER BY qcr.created_at DESC`,
  //     [userId]
  //   );
  //   return result.rows;
  // }

  // async getQuizCollaborators(quizId: number): Promise<any[]> {
  //   const result = await pool.query(
  //     `SELECT qcr.user_id, qcr.updated_at AS accepted_at, u.username, u.first_name, u.last_name
  //      FROM quiz_collaborator_request qcr JOIN users u ON u.id = qcr.user_id
  //      WHERE qcr.quiz_id = $1 AND qcr.status = 'accepted' ORDER BY qcr.updated_at ASC`,
  //     [quizId]
  //   );
  //   return result.rows;
  // }

  // async getCollaborationProjects(userId: number): Promise<any[]> {
  //   const query = `
  //     WITH collaborator_lists AS (
  //       SELECT qcr.quiz_id,
  //         COALESCE(json_agg(json_build_object('user_id',u.id,'username',u.username,'first_name',u.first_name,'last_name',u.last_name,'avatar_url',a.url) ORDER BY u.username) FILTER (WHERE qcr.status='accepted'),'[]'::json) AS collaborators
  //       FROM quiz_collaborator_request qcr
  //       JOIN users u ON u.id = qcr.user_id LEFT JOIN avatar a ON a.id = u.avatar_id
  //       WHERE qcr.status='accepted' GROUP BY qcr.quiz_id
  //     )
  //     SELECT q.id, q.name, q.code, q.createdby, qs.name AS status, q.starttime, q.endtime,
  //       q.created_at, q.updated_at, u.username AS creator_username, u.first_name AS creator_first_name,
  //       u.last_name AS creator_last_name, a.url AS creator_avatar_url, 'collaborator' AS my_role,
  //       qcr.invited_by, qcr.updated_at AS accepted_at, cl.collaborators,
  //       COUNT(DISTINCT qp.id)::int AS total_questions, COUNT(DISTINCT qr.id)::int AS participants
  //     FROM quiz_collaborator_request qcr
  //     JOIN quiz q ON q.id = qcr.quiz_id
  //     JOIN users u ON u.id = q.createdby
  //     LEFT JOIN avatar a ON a.id = u.avatar_id
  //     LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
  //     LEFT JOIN collaborator_lists cl ON cl.quiz_id = q.id
  //     LEFT JOIN quiz_problems qp ON qp.quiz_id = q.id
  //     LEFT JOIN quiz_registration qr ON qr.quiz_id = q.id AND qr.is_registered = true
  //     WHERE qcr.user_id = $1 AND qcr.status = 'accepted'
  //     GROUP BY q.id, u.username, u.first_name, u.last_name, a.url, qcr.invited_by, qcr.updated_at, cl.collaborators, qs.name
  //     ORDER BY qcr.updated_at DESC NULLS LAST, q.id DESC
  //   `;
  //   const result = await pool.query(query, [userId]);
  //   return result.rows.map((row) => ({
  //     ...row,
  //     collaborators: Array.isArray(row.collaborators) ? row.collaborators : [],
  //     total_questions: row.total_questions ? Number(row.total_questions) : 0,
  //     participants: row.participants ? Number(row.participants) : 0,
  //   }));
  // }

  // ==================== RESPONSES / RESULTS (admin view) ====================

  async getQuizResponses(quizId: number): Promise<{ quiz: any; students: any[]; summary: any }> {
    const quizResult = await pool.query(
      `SELECT q.id, q.name, q.code, q.total_marks, q.passing_marks, qs.name AS status, q.starttime, q.endtime
       FROM quiz q LEFT JOIN quiz_status qs ON qs.id = q.quiz_status WHERE q.id = $1`,
      [quizId]
    );
    const quiz = quizResult.rows[0] || null;
    if (!quiz) throw new Error("Quiz not found");

    const studentsResult = await pool.query(
      `SELECT qr.user_id, qr.rollno,
        u.username, u.first_name, u.last_name, u.email,
        qa.id AS attempt_id, qa.score, qa.percentage, qa.rank, qa.status AS attempt_status,
        qa.completed_at, qa.time_taken, qa.total_questions, qa.correct_answers, qa.wrong_answers, qa.skipped_questions
       FROM quiz_registration qr
       JOIN users u ON u.id = qr.user_id
       LEFT JOIN quiz_attempt qa ON qa.quiz_id = qr.quiz_id AND qa.user_id = qr.user_id
       WHERE qr.quiz_id = $1 AND qr.is_registered = true
       ORDER BY qa.score DESC NULLS LAST, qa.time_taken ASC NULLS LAST, u.first_name ASC`,
      [quizId]
    );

    const counts = await pool.query(
      `SELECT COUNT(*) AS total,
        COUNT(qa.id) FILTER (WHERE qa.status='completed') AS submitted,
        COUNT(*) FILTER (WHERE qa.id IS NULL OR qa.status<>'completed') AS not_submitted,
        AVG(qa.score) AS average_score, MAX(qa.score) AS highest_score, MIN(qa.score) AS lowest_score
       FROM quiz_registration qr
       LEFT JOIN quiz_attempt qa ON qa.quiz_id = qr.quiz_id AND qa.user_id = qr.user_id
       WHERE qr.quiz_id = $1 AND qr.is_registered = true`,
      [quizId]
    );
    const summary = counts.rows[0] || {};
    return {
      quiz,
      students: studentsResult.rows,
      summary: {
        total: parseInt(summary.total) || 0, submitted: parseInt(summary.submitted) || 0,
        not_submitted: parseInt(summary.not_submitted) || 0,
        average_score: parseFloat(summary.average_score) || 0,
        highest_score: parseFloat(summary.highest_score) || 0,
        lowest_score: summary.lowest_score === null ? null : parseFloat(summary.lowest_score),
        total_marks: quiz.total_marks || 0,
      },
    };
  }

  async getStudentAttemptDetails(quizId: number, userId: number): Promise<any | null> {
    const result = await pool.query(
      `SELECT qa.id AS attempt_id, qa.user_id, qa.quiz_id, qa.score, qa.percentage, qa.rank,
        qa.status AS attempt_status, qa.completed_at, qa.time_taken, qa.total_questions,
        qa.correct_answers, qa.wrong_answers, qa.skipped_questions,
        u.username, u.first_name, u.last_name, u.email
       FROM quiz_attempt qa JOIN users u ON u.id = qa.user_id
       WHERE qa.quiz_id = $1 AND qa.user_id = $2 ORDER BY qa.created_at DESC LIMIT 1`,
      [quizId, userId]
    );
    return result.rows.length ? result.rows[0] : null;
  }

  async getStudentQuestionReview(attemptId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT qp.id AS problem_id, qp.question_number, qp.problem_statement, qp.problem_description,
        qp.explaination, qpt.name AS problem_type,
        correct.option_statement AS correct_answer, qsr.answer AS raw_answer,
        qsr.answer->>'selectedOptionId' AS selected_option_id,
        selected.option_statement AS selected_statement, qsr.created_at AS answered_at,
        CASE
          WHEN qsr.answer IS NULL THEN 'unanswered'
          WHEN qsr.answer->>'selectedOptionId' IS NULL THEN 'unanswered'
          WHEN selected.id IS NULL THEN 'unanswered'
          WHEN selected.iscorrect THEN 'correct'
          ELSE 'wrong'
        END AS status
       FROM quiz_problems qp
       LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
       LEFT JOIN quiz_student_response qsr ON qsr.problem_id = qp.id AND qsr.attempt_id = $1
       LEFT JOIN quiz_problem_options correct ON correct.problem_id = qp.id AND correct.iscorrect = true
       LEFT JOIN quiz_problem_options selected ON selected.id = (qsr.answer->>'selectedOptionId')::int
       WHERE qp.quiz_id = (SELECT quiz_id FROM quiz_attempt WHERE id = $1)
       ORDER BY qp.question_number ASC`,
      [attemptId]
    );
    return result.rows;
  }

  // ==================== PARTICIPANTS ====================

  async replaceQuizParticipants(
    quizId: number,
    participants: Array<{
      email: string; name?: string | null; rollNumber?: string | null;
      source?: "room" | "individual"; roomId?: number | null; allowed?: boolean;
    }>
  ): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM quiz_participants WHERE quiz_id = $1", [quizId]);
      let saved = 0;
      for (const p of participants) {
        if (!p?.email) continue;
        await client.query(
          `INSERT INTO quiz_participants (quiz_id, email, name, roll_number, source, room_id, allowed, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT (quiz_id, email) DO NOTHING`,
          [quizId, p.email.toLowerCase(), p.name ?? null, p.rollNumber ?? null,
           p.source === "room" ? "room" : "individual", p.roomId ?? null, p.allowed !== false]
        );
        saved++;
      }
      await client.query("COMMIT");
      return saved;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async getQuizParticipants(quizId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT id, email, name, roll_number, source, allowed, created_at
       FROM quiz_participants
       WHERE quiz_id = $1
       ORDER BY created_at ASC, id ASC`,
      [quizId]
    );
    return result.rows;
  }
  // ==================== ANALYTICS ====================

  async getQuizAnalytics(quizId: number): Promise<any> {
    const quizMeta = await pool.query("SELECT total_marks, passing_marks, duration FROM quiz WHERE id=$1", [quizId]);
    const qm = quizMeta.rows[0] || { total_marks: 0, passing_marks: 0, duration: null };
    const passingMarks = qm.passing_marks || 0;
    const totalMarks = qm.total_marks || 0;

    const statsResult = await pool.query(`
      SELECT COUNT(DISTINCT qa.id) AS total_attempts,
        COUNT(DISTINCT CASE WHEN qa.status='completed' THEN qa.id END) AS completed_attempts,
        COUNT(DISTINCT CASE WHEN qa.status='in_progress' THEN qa.id END) AS in_progress_attempts,
        AVG(qa.score) AS average_score,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY qa.score) AS median_score,
        MAX(qa.score) AS highest_score, MIN(qa.score) AS lowest_score,
        STDDEV_POP(qa.score) AS stddev_score, AVG(qa.percentage) AS average_accuracy,
        AVG(qa.time_taken) AS average_completion_time,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY qa.time_taken) AS median_time,
        MIN(qa.time_taken) AS fastest_time, MAX(qa.time_taken) AS slowest_time,
        COUNT(DISTINCT qr.id) AS total_registrations,
        COUNT(DISTINCT CASE WHEN qa.score >= $2 THEN qa.id END) AS passed_count
      FROM quiz_attempt qa
      LEFT JOIN quiz_registration qr ON qr.quiz_id = $1
      WHERE qa.quiz_id = $1
    `, [quizId, passingMarks]);
    const s = statsResult.rows[0] || {};

    let scoreDistribution: any[] = [];
    try {
      const r = await pool.query(`
        SELECT bucket, COUNT(*)::int as count FROM (
          SELECT WIDTH_BUCKET(LEAST(GREATEST(qa.percentage,0),100), 0, 100, 10) as bucket
          FROM quiz_attempt qa WHERE qa.quiz_id=$1 AND qa.status='completed' AND qa.percentage IS NOT NULL
        ) t GROUP BY bucket ORDER BY bucket
      `, [quizId]);
      scoreDistribution = r.rows;
    } catch {}

    let scoreVsTime: any[] = [];
    try {
      const r = await pool.query(`
        SELECT qa.score, qa.percentage, qa.time_taken, qa.user_id, u.username
        FROM quiz_attempt qa LEFT JOIN users u ON u.id=qa.user_id
        WHERE qa.quiz_id=$1 AND qa.status='completed' AND qa.time_taken IS NOT NULL AND qa.score IS NOT NULL
        ORDER BY qa.completed_at DESC LIMIT 300
      `, [quizId]);
      scoreVsTime = r.rows.map((row: any) => ({ x: row.time_taken, y: row.score, percentage: row.percentage, username: row.username, user_id: row.user_id }));
    } catch {}

    let questionStats: any[] = [];
    try {
      const r = await pool.query(`
        SELECT qp.id, qp.question_number, qp.problem_statement, qpt.name AS problem_type,
          qp.difficulty, qd.heading AS difficulty_name,
          COUNT(DISTINCT qsr.id) AS total_responses,
          COUNT(DISTINCT CASE WHEN COALESCE(qsr.is_correct, (qpo.iscorrect AND qsr.answer IS NOT NULL)) THEN qsr.id END) AS correct_responses,
          COUNT(DISTINCT CASE WHEN qsr.is_correct = false OR (qsr.is_correct IS NULL AND qsr.answer IS NOT NULL AND COALESCE(qpo.iscorrect,false)=false) THEN qsr.id END) AS incorrect_responses,
          AVG(qsr.time_spent_ms) AS avg_time_ms,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY qsr.time_spent_ms) AS median_time_ms,
          MAX(qsr.time_spent_ms) AS max_time_ms
        FROM quiz_problems qp
        LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
        LEFT JOIN quiz_difficulty qd ON qd.id = qp.difficulty
        LEFT JOIN quiz_student_response qsr ON qsr.problem_id = qp.id
        LEFT JOIN quiz_problem_options qpo ON qpo.id::text = qsr.answer::text AND qpo.iscorrect = true
        WHERE qp.quiz_id = $1
        GROUP BY qp.id, qpt.name, qd.heading ORDER BY qp.question_number ASC
      `, [quizId]);
      questionStats = r.rows;
    } catch {
      const r2 = await pool.query(`
        SELECT qp.id, qp.question_number, qp.problem_statement, qpt.name AS problem_type,
          qp.difficulty, qd.heading AS difficulty_name, COUNT(DISTINCT qsr.id) AS total_responses, 0 as correct_responses
        FROM quiz_problems qp
        LEFT JOIN quiz_problem_type qpt ON qpt.id=qp.quiz_problem_type
        LEFT JOIN quiz_difficulty qd ON qd.id=qp.difficulty
        LEFT JOIN quiz_student_response qsr ON qsr.problem_id=qp.id
        WHERE qp.quiz_id=$1 GROUP BY qp.id,qpt.name,qd.heading ORDER BY qp.question_number
      `, [quizId]);
      questionStats = r2.rows;
    }

    const totalAttemptsNum = parseInt(s.total_attempts) || 0;
    questionStats = questionStats.map((q: any) => {
      const totalResp = parseInt(q.total_responses) || 0;
      const correct = parseInt(q.correct_responses) || 0;
      const incorrect = parseInt(q.incorrect_responses) || 0;
      const skipped = Math.max(0, totalAttemptsNum - totalResp);
      const accuracy = totalResp > 0 ? (correct / totalResp * 100) : 0;
      return {
        ...q, total_attempts: totalResp, total_responses: totalResp,
        correct_responses: correct, incorrect_responses: incorrect, skipped_count: skipped,
        accuracy: parseFloat(accuracy.toFixed(1)),
        avg_time_ms: q.avg_time_ms ? parseInt(q.avg_time_ms) : null,
        median_time_ms: q.median_time_ms ? parseInt(q.median_time_ms) : null,
        max_time_ms: q.max_time_ms ? parseInt(q.max_time_ms) : null,
        id: q.id, question_number: q.question_number, problem_statement: q.problem_statement,
        problem_type: q.problem_type, difficulty: q.difficulty, difficulty_name: q.difficulty_name,
      };
    });

    const funnel = questionStats.map((q: any) => ({ question_number: q.question_number, problem_statement: q.problem_statement, reached: parseInt(q.total_responses) || 0 }));

    let difficultyStats: any[] = [];
    try {
      const r = await pool.query(`
        SELECT qd.heading as difficulty_name, qd.id as difficulty,
          COUNT(DISTINCT qsr.id) as responses,
          COUNT(DISTINCT CASE WHEN COALESCE(qsr.is_correct, (qpo.iscorrect AND qsr.answer IS NOT NULL)) THEN qsr.id END) as correct,
          AVG(qsr.time_spent_ms) as avg_time
        FROM quiz_problems qp
        LEFT JOIN quiz_difficulty qd ON qd.id=qp.difficulty
        LEFT JOIN quiz_student_response qsr ON qsr.problem_id=qp.id
        LEFT JOIN quiz_problem_options qpo ON qpo.id::text = qsr.answer::text
        WHERE qp.quiz_id=$1 GROUP BY qd.heading, qd.id ORDER BY qd.id
      `, [quizId]);
      difficultyStats = r.rows.map((r: any) => ({ ...r, accuracy: r.responses > 0 ? (r.correct / r.responses * 100) : 0 }));
    } catch {}

    let gameEventsSummary: any = { total_events: 0, by_type: [] };
    let fiftyFiftyByQuestion: any[] = [];
    let powerUpTimeline: any[] = [];
    let livesDistribution: any[] = [];
    try {
      const byType = await pool.query(`SELECT event_type, COUNT(*)::int as total_uses, COUNT(DISTINCT user_id)::int as unique_users FROM quiz_game_events WHERE quiz_id=$1 GROUP BY event_type ORDER BY total_uses DESC`, [quizId]);
      gameEventsSummary = { total_events: byType.rows.reduce((a: number, b: any) => a + b.total_uses, 0), by_type: byType.rows };
      const byQ = await pool.query(`SELECT question_id, COUNT(*)::int as uses, COUNT(DISTINCT user_id)::int as unique_users FROM quiz_game_events WHERE quiz_id=$1 AND event_type='fifty_fifty' GROUP BY question_id ORDER BY uses DESC`, [quizId]);
      fiftyFiftyByQuestion = byQ.rows;
      const timeline = await pool.query(`SELECT date_trunc('hour', created_at) as hour, COUNT(*)::int as cnt FROM quiz_game_events WHERE quiz_id=$1 AND created_at > NOW() - INTERVAL '7 days' GROUP BY hour ORDER BY hour`, [quizId]);
      powerUpTimeline = timeline.rows;
      const livesCfg = await pool.query(`SELECT lives FROM quiz_game_config WHERE quiz_id=$1`, [quizId]);
      const cfgLives = livesCfg.rows[0]?.lives ?? 3;
      const lifeLost = await pool.query(`SELECT attempt_id, COUNT(*)::int as lost FROM quiz_game_events WHERE quiz_id=$1 AND event_type='life_lost' GROUP BY attempt_id`, [quizId]);
      const hist: Record<string, number> = {};
      for (let i = 0; i <= cfgLives; i++) hist[String(i)] = 0;
      if (lifeLost.rows.length > 0) {
        lifeLost.rows.forEach((r: any) => { const rem = Math.max(0, cfgLives - r.lost); hist[String(rem)] = (hist[String(rem)] || 0) + 1; });
      }
      livesDistribution = Object.entries(hist).map(([k, v]) => ({ lives_remaining: parseInt(k), count: v }));
    } catch {
      gameEventsSummary = { total_events: 0, by_type: [], note: "No game events recorded yet" };
    }

    let students: any[] = [];
    try {
      const r = await pool.query(`SELECT qa.id as attempt_id, qa.user_id, u.username, u.email, qa.score, qa.percentage, qa.correct_answers, qa.wrong_answers, qa.skipped_questions, qa.time_taken, qa.rank, qa.status, qa.completed_at FROM quiz_attempt qa LEFT JOIN users u ON u.id=qa.user_id WHERE qa.quiz_id=$1 ORDER BY qa.score DESC NULLS LAST, qa.time_taken ASC LIMIT 50`, [quizId]);
      students = r.rows;
    } catch {}

    const insights: string[] = [];
    if (questionStats.length > 0) {
      const sortedByAcc = [...questionStats].sort((a: any, b: any) => a.accuracy - b.accuracy);
      if (sortedByAcc[0]) insights.push(`Question ${sortedByAcc[0].question_number} has the lowest accuracy (${sortedByAcc[0].accuracy}%).`);
      if (sortedByAcc[sortedByAcc.length - 1]) insights.push(`Question ${sortedByAcc[sortedByAcc.length - 1].question_number} has the highest accuracy (${sortedByAcc[sortedByAcc.length - 1].accuracy}%).`);
      const maxTimeQ = [...questionStats].sort((a: any, b: any) => (b.avg_time_ms || 0) - (a.avg_time_ms || 0))[0];
      if (maxTimeQ && maxTimeQ.avg_time_ms) insights.push(`Question ${maxTimeQ.question_number} has the highest average time (${(maxTimeQ.avg_time_ms / 1000).toFixed(1)}s).`);
      const maxDrop = funnel.slice(1).map((f: any, i: number) => ({ ...f, drop: (funnel[i].reached - f.reached) })).sort((a: any, b: any) => b.drop - a.drop)[0];
      if (maxDrop && maxDrop.drop > 0) insights.push(`Largest drop-off after Question ${maxDrop.question_number - 1} → ${maxDrop.question_number} (${maxDrop.drop} fewer students).`);
    }
    if (gameEventsSummary.by_type?.length > 0) {
      const topEvent = gameEventsSummary.by_type[0];
      insights.push(`${topEvent.event_type} was the most used power-up (${topEvent.total_uses} uses).`);
      if (fiftyFiftyByQuestion[0]) {
        const q = questionStats.find((qq: any) => String(qq.id) === String(fiftyFiftyByQuestion[0].question_id));
        if (q) insights.push(`50-50 was used most on Question ${q.question_number} (${fiftyFiftyByQuestion[0].uses} uses).`);
      }
    } else {
      insights.push("No game events have been recorded yet — power-up analytics will appear once students use lifelines.");
    }
    const completionPctNum = s.total_registrations > 0 ? (parseInt(s.completed_attempts || 0) / parseInt(s.total_registrations)) * 100 : 0;
    if (completionPctNum < 50 && totalAttemptsNum > 5) insights.push(`Completion rate is low (${completionPctNum.toFixed(1)}%) — consider difficulty or duration.`);

    return {
      stats: {
        total_attempts: totalAttemptsNum,
        completed_attempts: parseInt(s.completed_attempts) || 0,
        in_progress_attempts: parseInt(s.in_progress_attempts) || 0,
        average_score: parseFloat(s.average_score) || 0,
        median_score: parseFloat(s.median_score) || 0,
        highest_score: parseFloat(s.highest_score) || 0,
        lowest_score: parseFloat(s.lowest_score) || 0,
        stddev_score: parseFloat(s.stddev_score) || 0,
        average_accuracy: parseFloat(s.average_accuracy) || 0,
        average_completion_time: parseFloat(s.average_completion_time) || 0,
        median_time: parseFloat(s.median_time) || 0,
        fastest_time: s.fastest_time ? parseInt(s.fastest_time) : null,
        slowest_time: s.slowest_time ? parseInt(s.slowest_time) : null,
        completion_rate: s.total_registrations > 0 ? ((parseInt(s.completed_attempts) / parseInt(s.total_registrations)) * 100).toFixed(2) : "0.00",
        total_registrations: parseInt(s.total_registrations) || 0,
        passed_count: parseInt(s.passed_count) || 0,
        pass_rate: totalAttemptsNum > 0 ? ((parseInt(s.passed_count) || 0) / totalAttemptsNum * 100).toFixed(1) : "0.0",
      },
      question_stats: questionStats,
      quiz: { id: quizId, total_marks: totalMarks, passing_marks: passingMarks },
      score_distribution: scoreDistribution, score_vs_time: scoreVsTime,
      funnel, difficulty_stats: difficultyStats,
      game: gameEventsSummary, fifty_fifty_by_question: fiftyFiftyByQuestion,
      powerup_timeline: powerUpTimeline, lives_distribution: livesDistribution,
      students, insights,
    };
  }

  // ==================== GAME CONFIG ====================

  getDefaultGameConfig(quizId: number) {
    return {
      quizId, enabled: true, movementEnabled: true, movementSpeed: 5, lives: 3,
      pointsEnabled: true, powerupsEnabled: false, respawnEnabled: true, damageEnabled: false,
    };
  }

  private mapGameConfigRow(row: any) {
    return {
      quizId: row.quiz_id, enabled: row.enabled, movementEnabled: row.movement_enabled,
      movementSpeed: row.movement_speed, lives: row.lives, pointsEnabled: row.points_enabled,
      powerupsEnabled: row.powerups_enabled, respawnEnabled: row.respawn_enabled,
      damageEnabled: row.damage_enabled,
    };
  }

  async getQuizGameConfig(quizId: number): Promise<any> {
    const result = await pool.query("SELECT * FROM quiz_game_config WHERE quiz_id = $1 LIMIT 1", [quizId]);
    if (result.rows.length === 0) return this.getDefaultGameConfig(quizId);
    return this.mapGameConfigRow(result.rows[0]);
  }

  async upsertQuizGameConfig(quizId: number, data: {
    enabled: boolean; movementEnabled: boolean; movementSpeed: number;
    lives: number; pointsEnabled: boolean; powerupsEnabled: boolean;
    respawnEnabled: boolean; damageEnabled: boolean;
  }): Promise<any> {
    const result = await pool.query(`
      INSERT INTO quiz_game_config (quiz_id, enabled, movement_enabled, movement_speed, lives,
        points_enabled, powerups_enabled, respawn_enabled, damage_enabled, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT (quiz_id) DO UPDATE SET
        enabled=EXCLUDED.enabled, movement_enabled=EXCLUDED.movement_enabled,
        movement_speed=EXCLUDED.movement_speed, lives=EXCLUDED.lives,
        points_enabled=EXCLUDED.points_enabled, powerups_enabled=EXCLUDED.powerups_enabled,
        respawn_enabled=EXCLUDED.respawn_enabled, damage_enabled=EXCLUDED.damage_enabled,
        updated_at=CURRENT_TIMESTAMP
      RETURNING *
    `, [quizId, data.enabled, data.movementEnabled, data.movementSpeed,
         data.lives, data.pointsEnabled, data.powerupsEnabled, data.respawnEnabled, data.damageEnabled]);
    return this.mapGameConfigRow(result.rows[0]);
  }

  async getAllGameMechanics(): Promise<any[]> {
    const result = await pool.query("SELECT id, name, code, description, icon, mechanic_type, default_quantity, enabled FROM game_mechanics WHERE enabled = TRUE ORDER BY id");
    return result.rows.map((row) => ({
      id: row.id, name: row.name, code: row.code, description: row.description,
      icon: row.icon, mechanicType: row.mechanic_type, defaultQuantity: row.default_quantity,
      enabled: row.enabled,
    }));
  }

  async getQuizGameMechanics(quizId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT qgm.id, qgm.enabled, qgm.quantity,
        gm.name, gm.code, gm.description, gm.icon, gm.mechanic_type
       FROM quiz_game_mechanics qgm JOIN game_mechanics gm ON gm.id = qgm.mechanic_id
       WHERE qgm.quiz_id = $1 ORDER BY gm.id`,
      [quizId]
    );
    return result.rows.map((row) => ({
      id: row.id, name: row.name, code: row.code, description: row.description,
      icon: row.icon, mechanicType: row.mechanic_type, enabled: row.enabled, quantity: row.quantity,
    }));
  }

  async upsertQuizGameMechanics(quizId: number, mechanics: { mechanicCode: string; enabled: boolean; quantity: number }[]): Promise<any[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM quiz_game_mechanics WHERE quiz_id = $1", [quizId]);
      for (const m of mechanics) {
        const mechResult = await client.query("SELECT id FROM game_mechanics WHERE code = $1", [m.mechanicCode]);
        if (mechResult.rows.length === 0) continue;
        await client.query(
          `INSERT INTO quiz_game_mechanics (quiz_id, mechanic_id, enabled, quantity, created_at, updated_at)
           VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          [quizId, mechResult.rows[0].id, m.enabled, m.quantity]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.getQuizGameMechanics(quizId);
  }
}
