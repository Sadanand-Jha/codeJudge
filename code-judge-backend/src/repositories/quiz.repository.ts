import { pool } from "../app.ts";

export class QuizRepository {
  /**
   * Get all quizzes with filters and pagination
   */
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
      conditions.push(`q.status = $${paramCount}`);
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

    const countQuery = `SELECT COUNT(*) FROM quiz q ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const allowedSortFields = ["name", "code", "created_at", "starttime", "endtime", "total_marks"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const query = `
      SELECT
        q.id,
        q.name,
        q.code,
        q.createdby,
        q.starttime,
        q.endtime,
        q.visibility,
        q.difficulty,
        q.total_marks,
        q.passing_marks,
        q.shuffle_questions,
        q.shuffle_options,
        q.Show_Results_Immediately,
        q.negative_marking,
        q.leaderboard,
        q.status,
        q.created_at,
        q.updated_at,
        u.username AS creator_name,
        qv.heading AS visibility_name,
        qd.heading AS difficulty_name,
        COUNT(DISTINCT qr.id) AS participants,
        COUNT(DISTINCT qp.id) AS total_questions,
        COALESCE(AVG(CASE WHEN qsr.option IS NOT NULL THEN 1 ELSE 0 END), 0) AS completion_rate
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_difficulty qd ON qd.id = q.difficulty
      LEFT JOIN quiz_registration qr ON qr.quiz_id = q.id AND qr.is_registered = true
      LEFT JOIN quiz_problems qp ON qp.quiz_id = q.id
      LEFT JOIN quiz_student_response qsr ON qsr.user_id = qr.user_id AND qsr.problem_id = qp.id
      ${whereClause}
      GROUP BY q.id, u.username, qv.heading, qd.heading
      ORDER BY q.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const result = await pool.query(query, queryParams);
    return { quizzes: result.rows, total };
  }

  /**
   * Get a single quiz by ID with full details
   */
  async getQuizById(quizId: string): Promise<any | null> {
    const query = `
      SELECT
        q.id,
        q.name,
        q.code,
        q.createdby,
        q.starttime,
        q.endtime,
        q.visibility,
        q.difficulty,
        q.total_marks,
        q.passing_marks,
        q.shuffle_questions,
        q.shuffle_options,
        q.Show_Results_Immediately,
        q.negative_marking,
        q.leaderboard,
        q.status,
        q.created_at,
        q.updated_at,
        u.username AS creator_name,
        qv.heading AS visibility_name,
        qd.heading AS difficulty_name
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_difficulty qd ON qd.id = q.difficulty
      WHERE q.id = $1
    `;
    const result = await pool.query(query, [quizId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get a quiz by its code with full details
   */
  async getQuizByCode(code: string): Promise<any | null> {
    const query = `
      SELECT
        q.id,
        q.name,
        q.code,
        q.createdby,
        q.starttime,
        q.endtime,
        q.visibility,
        q.difficulty,
        q.total_marks,
        q.passing_marks,
        q.shuffle_questions,
        q.shuffle_options,
        q.Show_Results_Immediately,
        q.negative_marking,
        q.leaderboard,
        q.status,
        q.created_at,
        q.updated_at,
        u.username AS creator_name,
        qv.heading AS visibility_name,
        qd.heading AS difficulty_name
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_difficulty qd ON qd.id = q.difficulty
      WHERE q.code = $1
    `;
    const result = await pool.query(query, [code]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all problems for a quiz with full details
   */
  async getQuizProblems(quizId: string): Promise<any[]> {
    const query = `
      SELECT
        qp.id,
        qp.quiz_id,
        qp.problem_statement,
        qp.problem_description,
        qp.quiz_problem_type,
        qpt.name AS problem_type_name,
        qp.question_number,
        qp.explaination,
        qp.hint,
        qp.difficulty,
        qp.reference_notes,
        qp.internal_comments,
        qd.heading AS difficulty_name,
        qp.created_at,
        qp.updated_at
      FROM quiz_problems qp
      LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
      LEFT JOIN quiz_difficulty qd ON qd.id = qp.difficulty
      WHERE qp.quiz_id = $1
      ORDER BY qp.question_number ASC, qp.id ASC
    `;
    const result = await pool.query(query, [quizId]);
    return result.rows;
  }

  /**
   * Get all options for a quiz problem
   */
  async getQuizProblemOptions(problemId: string): Promise<any[]> {
    const query = `
      SELECT
        qpo.id,
        qpo.problem_id,
        qpo.option_statement,
        qpo.option_description,
        qpo.iscorrect,
        qpo.created_at,
        qpo.updated_at
      FROM quiz_problem_options qpo
      WHERE qpo.problem_id = $1
      ORDER BY qpo.id ASC
    `;
    const result = await pool.query(query, [problemId]);
    return result.rows;
  }

  /**
   * Check if a user is registered for a quiz
   */
  async isUserRegistered(userId: string, quizId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM quiz_registration
      WHERE user_id = $1 AND quiz_id = $2 AND is_registered = true
      LIMIT 1
    `;
    const result = await pool.query(query, [userId, quizId]);
    return result.rows.length > 0;
  }

  /**
   * Register a user for a quiz
   */
  async registerUser(userId: string, quizId: string, rollno?: string): Promise<any> {
    const query = `
      INSERT INTO quiz_registration (user_id, quiz_id, is_registered, rollno, created_at, updated_at)
      VALUES ($1, $2, true, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, quiz_id) DO UPDATE
      SET is_registered = true, rollno = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [userId, quizId, rollno || null]);
    return result.rows[0];
  }

  /**
   * Get user's quiz registrations with attempt details
   */
  async getUserQuizzes(userId: string): Promise<any[]> {
    const query = `
      SELECT
        q.id,
        q.name,
        q.code,
        q.starttime,
        q.endtime,
        q.total_marks,
        q.passing_marks,
        q.leaderboard,
        q.status,
        q.visibility,
        qv.heading AS visibility_name,
        qr.is_registered,
        qr.rollno,
        qr.created_at AS registered_at,
        qa.id AS attempt_id,
        qa.score,
        qa.percentage,
        qa.rank,
        qa.status AS attempt_status,
        qa.completed_at,
        qa.time_taken,
        qa.total_questions,
        qa.correct_answers,
        qa.wrong_answers,
        qa.skipped_questions
      FROM quiz_registration qr
      JOIN quiz q ON q.id = qr.quiz_id
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = qr.user_id
      WHERE qr.user_id = $1
      ORDER BY q.starttime DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Create a new quiz
   */
  async createQuiz(data: {
    name: string;
    code: string;
    createdby: number;
    starttime?: Date;
    endtime?: Date;
    visibility?: number;
    difficulty?: number;
    totalMarks?: number;
    passingMarks?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResultsImmediately?: boolean;
    negativeMarking?: boolean;
    leaderboard?: boolean;
    status?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO quiz (
        name, code, createdby, starttime, endtime, visibility, difficulty,
        total_marks, passing_marks, shuffle_questions, shuffle_options,
        Show_Results_Immediately, negative_marking, leaderboard, status,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.name,
      data.code,
      data.createdby,
      data.starttime || null,
      data.endtime || null,
      data.visibility || null,
      data.difficulty || null,
      data.totalMarks || 0,
      data.passingMarks || 0,
      data.shuffleQuestions || false,
      data.shuffleOptions || false,
      data.showResultsImmediately || false,
      data.negativeMarking || false,
      data.leaderboard !== false,
      data.status || "draft",
    ]);
    return result.rows[0];
  }

  /**
   * Create a quiz problem
   */
  async createQuizProblem(data: {
    quizId: number;
    problemStatement: string;
    problemDescription?: string;
    quizProblemType?: number;
    questionNumber?: number;
    explanation?: string;
    hint?: string;
    difficulty?: number;
    referenceNotes?: string;
    internalComments?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO quiz_problems (
        quiz_id, problem_statement, problem_description, quiz_problem_type,
        question_number, explaination, hint, difficulty, reference_notes, internal_comments,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.quizId,
      data.problemStatement,
      data.problemDescription || null,
      data.quizProblemType || null,
      data.questionNumber || 1,
      data.explanation || null,
      data.hint || null,
      data.difficulty || null,
      data.referenceNotes || null,
      data.internalComments || null,
    ]);
    return result.rows[0];
  }

  /**
   * Create a quiz problem option
   */
  async createQuizProblemOption(data: {
    problemId: number;
    optionStatement: string;
    optionDescription?: string;
    isCorrect: boolean;
  }): Promise<any> {
    const query = `
      INSERT INTO quiz_problem_options (problem_id, option_statement, option_description, iscorrect, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.problemId,
      data.optionStatement,
      data.optionDescription || null,
      data.isCorrect,
    ]);
    return result.rows[0];
  }

  // ==================== NEW METHODS FOR FULL QUIZ MODULE ====================

  async updateQuiz(quizId: number, data: any): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    const updateableFields = [
      "name", "code", "starttime", "endtime", "visibility", "difficulty",
      "total_marks", "passing_marks", "shuffle_questions", "shuffle_options",
      "Show_Results_Immediately", "negative_marking", "leaderboard", "status"
    ];

    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return null;

    paramCount++;
    values.push(quizId);

    const query = `
      UPDATE quiz
      SET ${fields.join(", ")} = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteQuiz(quizId: number): Promise<boolean> {
    const query = `DELETE FROM quiz WHERE id = $1`;
    const result = await pool.query(query, [quizId]);
    return result.rowCount ? true : false;
  }

  async cloneQuiz(quizId: number, newName: string, newCode: string, createdBy: number): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const originalQuiz = await client.query("SELECT * FROM quiz WHERE id = $1", [quizId]);
      if (!originalQuiz.rows.length) throw new Error("Quiz not found");

      const original = originalQuiz.rows[0];
      const newQuiz = await client.query(
        `INSERT INTO quiz (name, code, createdby, starttime, endtime, visibility, difficulty,
         total_marks, passing_marks, shuffle_questions, shuffle_options, Show_Results_Immediately,
         negative_marking, leaderboard, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          newName, newCode, createdBy, original.starttime, original.endtime,
          original.visibility, original.difficulty, original.total_marks, original.passing_marks,
          original.shuffle_questions, original.shuffle_options, original.Show_Results_Immediately,
          original.negative_marking, original.leaderboard
        ]
      );

      const newQuizId = newQuiz.rows[0].id;

      const problems = await client.query("SELECT * FROM quiz_problems WHERE quiz_id = $1", [quizId]);
      for (const problem of problems.rows) {
        const newProblem = await client.query(
          `INSERT INTO quiz_problems (quiz_id, problem_statement, problem_description, quiz_problem_type,
           question_number, explaination, hint, difficulty, reference_notes, internal_comments, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [
            newQuizId, problem.problem_statement, problem.problem_description, problem.quiz_problem_type,
            problem.question_number, problem.explaination, problem.hint, problem.difficulty,
            problem.reference_notes, problem.internal_comments
          ]
        );

        const newProblemId = newProblem.rows[0].id;
        const options = await client.query("SELECT * FROM quiz_problem_options WHERE problem_id = $1", [problem.id]);
        for (const option of options.rows) {
          await client.query(
            `INSERT INTO quiz_problem_options (problem_id, option_statement, option_description, iscorrect, created_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [newProblemId, option.option_statement, option.option_description, option.iscorrect]
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

  async updateQuizProblem(problemId: number, data: any): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    const updateableFields = [
      "problem_statement", "problem_description", "quiz_problem_type", "question_number",
      "explaination", "hint", "difficulty", "reference_notes", "internal_comments"
    ];

    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return null;

    paramCount++;
    values.push(problemId);

    const query = `
      UPDATE quiz_problems
      SET ${fields.join(", ")} = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteQuizProblem(problemId: number): Promise<boolean> {
    const query = `DELETE FROM quiz_problems WHERE id = $1`;
    const result = await pool.query(query, [problemId]);
    return result.rowCount ? true : false;
  }

  async duplicateQuizProblem(problemId: number): Promise<any> {
    const original = await pool.query("SELECT * FROM quiz_problems WHERE id = $1", [problemId]);
    if (!original.rows.length) return null;

    const problem = original.rows[0];
    const newProblem = await pool.query(
      `INSERT INTO quiz_problems (quiz_id, problem_statement, problem_description, quiz_problem_type,
       question_number, explaination, hint, difficulty, reference_notes, internal_comments, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        problem.quiz_id, problem.problem_statement, problem.problem_description, problem.quiz_problem_type,
        problem.question_number + 1, problem.explaination, problem.hint, problem.difficulty,
        problem.reference_notes, problem.internal_comments
      ]
    );

    const newProblemId = newProblem.rows[0].id;
    const options = await pool.query("SELECT * FROM quiz_problem_options WHERE problem_id = $1", [problemId]);
    for (const option of options.rows) {
      await pool.query(
        `INSERT INTO quiz_problem_options (problem_id, option_statement, option_description, iscorrect, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newProblemId, option.option_statement, option.option_description, option.iscorrect]
      );
    }

    return newProblem.rows[0];
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

  async getQuizAttempt(userId: number, quizId: number): Promise<any | null> {
    const query = `
      SELECT * FROM quiz_attempts
      WHERE user_id = $1 AND quiz_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [userId, quizId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async createQuizAttempt(data: {
    userId: number;
    quizId: number;
    totalQuestions: number;
  }): Promise<any> {
    const query = `
      INSERT INTO quiz_attempts (user_id, quiz_id, total_questions, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [data.userId, data.quizId, data.totalQuestions]);
    return result.rows[0];
  }

  async updateQuizAttempt(attemptId: number, data: any): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    const updateableFields = [
      "score", "percentage", "rank", "status", "completed_at", "time_taken",
      "total_questions", "correct_answers", "wrong_answers", "skipped_questions"
    ];

    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return null;

    paramCount++;
    values.push(attemptId);

    const query = `
      UPDATE quiz_attempts
      SET ${fields.join(", ")} = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async saveStudentResponse(data: {
    userId: number;
    problemId: number;
    option?: string;
    textAnswer?: string;
    timeTaken?: number;
  }): Promise<any> {
    const query = `
      INSERT INTO quiz_student_response (user_id, problem_id, option, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, problem_id) DO UPDATE
      SET option = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [data.userId, data.problemId, data.option || null]);
    return result.rows[0];
  }

  async getStudentResponses(userId: number, quizId: number): Promise<any[]> {
    const query = `
      SELECT qsr.*, qp.problem_statement, qp.quiz_problem_type, qp.question_number
      FROM quiz_student_response qsr
      JOIN quiz_problems qp ON qp.id = qsr.problem_id
      WHERE qsr.user_id = $1 AND qp.quiz_id = $2
      ORDER BY qp.question_number ASC
    `;
    const result = await pool.query(query, [userId, quizId]);
    return result.rows;
  }

  async getQuizLeaderboard(quizId: number): Promise<any[]> {
    const query = `
      SELECT
        qa.user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_id,
        a.url AS avatar_url,
        c.name AS college_name,
        qa.score,
        qa.percentage,
        qa.rank,
        qa.time_taken,
        qa.completed_at,
        qa.status,
        qa.correct_answers,
        qa.wrong_answers,
        qa.skipped_questions
      FROM quiz_attempts qa
      JOIN users u ON u.id = qa.user_id
      LEFT JOIN avatar a ON a.id = u.avatar_id
      LEFT JOIN college c ON c.id = u.college_id
      WHERE qa.quiz_id = $1 AND qa.status = 'completed'
      ORDER BY qa.score DESC, qa.time_taken ASC, qa.completed_at ASC
    `;
    const result = await pool.query(query, [quizId]);
    return result.rows;
  }

  async getQuizAnalytics(quizId: number): Promise<any> {
    const statsQuery = `
      SELECT
        COUNT(DISTINCT qa.id) AS total_attempts,
        AVG(qa.score) AS average_score,
        MAX(qa.score) AS highest_score,
        MIN(qa.score) AS lowest_score,
        AVG(qa.time_taken) AS average_completion_time,
        COUNT(DISTINCT CASE WHEN qa.status = 'completed' THEN qa.id END) AS completed_attempts,
        COUNT(DISTINCT qr.id) AS total_registrations
      FROM quiz_attempts qa
      LEFT JOIN quiz_registration qr ON qr.quiz_id = $1
      WHERE qa.quiz_id = $1
    `;
    const statsResult = await pool.query(statsQuery, [quizId]);
    const stats = statsResult.rows[0];

    const questionStatsQuery = `
      SELECT
        qp.id,
        qp.question_number,
        qp.problem_statement,
        qpt.name AS problem_type,
        qp.difficulty,
        qd.heading AS difficulty_name,
        COUNT(DISTINCT qsr.user_id) AS total_attempts,
        COUNT(DISTINCT CASE WHEN qsr.option IS NOT NULL THEN qsr.user_id END) AS total_responses,
        COUNT(DISTINCT CASE WHEN qpo.iscorrect = true AND qsr.option IS NOT NULL THEN qsr.user_id END) AS correct_responses
      FROM quiz_problems qp
      LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
      LEFT JOIN quiz_difficulty qd ON qd.id = qp.difficulty
      LEFT JOIN quiz_student_response qsr ON qsr.problem_id = qp.id
      LEFT JOIN quiz_problem_options qpo ON qpo.problem_id = qp.id AND qpo.iscorrect = true
      WHERE qp.quiz_id = $1
      GROUP BY qp.id, qpt.name, qd.heading
      ORDER BY qp.question_number ASC
    `;
    const questionStatsResult = await pool.query(questionStatsQuery, [quizId]);

    return {
      stats: {
        total_attempts: parseInt(stats.total_attempts) || 0,
        average_score: parseFloat(stats.average_score) || 0,
        highest_score: parseFloat(stats.highest_score) || 0,
        lowest_score: parseFloat(stats.lowest_score) || 0,
        average_completion_time: parseFloat(stats.average_completion_time) || 0,
        completion_rate: stats.total_registrations > 0
          ? ((parseInt(stats.completed_attempts) / parseInt(stats.total_registrations)) * 100).toFixed(2)
          : 0,
        total_registrations: parseInt(stats.total_registrations) || 0,
      },
      question_stats: questionStatsResult.rows,
    };
  }

  async checkQuizAccess(userId: number, quizId: number): Promise<{ allowed: boolean; reason?: string; attemptId?: number }> {
    const quiz = await pool.query("SELECT * FROM quiz WHERE id = $1", [quizId]);
    if (!quiz.rows.length) {
      return { allowed: false, reason: "Quiz not found" };
    }

    const q = quiz.rows[0];

    if (q.status === 'draft') {
      return { allowed: false, reason: "Quiz is not published" };
    }

    const now = new Date();
    if (q.starttime && new Date(q.starttime) > now) {
      return { allowed: false, reason: "Quiz has not started yet" };
    }
    if (q.endtime && new Date(q.endtime) < now) {
      return { allowed: false, reason: "Quiz has ended" };
    }

    const registration = await pool.query(
      "SELECT * FROM quiz_registration WHERE user_id = $1 AND quiz_id = $2 AND is_registered = true",
      [userId, quizId]
    );
    if (!registration.rows.length) {
      return { allowed: false, reason: "You are not registered for this quiz" };
    }

    const existingAttempt = await pool.query(
      "SELECT * FROM quiz_attempts WHERE user_id = $1 AND quiz_id = $2 AND status = 'in_progress'",
      [userId, quizId]
    );
    if (existingAttempt.rows.length > 0) {
      return { allowed: true, reason: "resume", attemptId: existingAttempt.rows[0].id };
    }

    return { allowed: true };
  }

  async getQuizByIdForAttempt(quizId: number): Promise<any | null> {
    const query = `
      SELECT q.*, qv.heading AS visibility_name
      FROM quiz q
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      WHERE q.id = $1 AND q.status = 'published'
    `;
    const result = await pool.query(query, [quizId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getPreviousQuizzes(userId: number, filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ quizzes: any[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "completed_at",
      sortOrder = "DESC",
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = ["qa.user_id = $1", "qa.status = 'completed'"];
    const queryParams: any[] = [userId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      conditions.push(`q.name ILIKE $${paramCount}`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = conditions.join(" AND ");

    const countQuery = `SELECT COUNT(*) FROM quiz_attempts qa JOIN quiz q ON q.id = qa.quiz_id WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const allowedSortFields = ["score", "percentage", "time_taken", "completed_at"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "completed_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const query = `
      SELECT
        qa.id AS attempt_id,
        q.id AS quiz_id,
        q.name,
        q.code,
        q.total_marks,
        q.passing_marks,
        qa.score,
        qa.percentage,
        qa.rank,
        qa.status,
        qa.completed_at,
        qa.time_taken,
        qa.total_questions,
        qa.correct_answers,
        qa.wrong_answers,
        qa.skipped_questions
      FROM quiz_attempts qa
      JOIN quiz q ON q.id = qa.quiz_id
      WHERE ${whereClause}
      ORDER BY qa.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const result = await pool.query(query, queryParams);
    return { quizzes: result.rows, total };
  }

  async getQuizResult(attemptId: number, userId: number): Promise<any | null> {
    const query = `
      SELECT qa.*, q.name, q.code, q.total_marks, q.passing_marks
      FROM quiz_attempts qa
      JOIN quiz q ON q.id = qa.quiz_id
      WHERE qa.id = $1 AND qa.user_id = $2
    `;
    const result = await pool.query(query, [attemptId, userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getQuestionWiseReview(attemptId: number, userId: number): Promise<any[]> {
    const query = `
      SELECT
        qp.id AS problem_id,
        qp.question_number,
        qp.problem_statement,
        qp.problem_description,
        qp.explaination,
        qp.hint,
        qpt.name AS problem_type,
        qpo.option_statement AS correct_answer,
        qsr.option AS selected_option,
        qsr.created_at AS answered_at
      FROM quiz_attempts qa
      JOIN quiz_problems qp ON qp.quiz_id = qa.quiz_id
      LEFT JOIN quiz_student_response qsr ON qsr.user_id = qa.user_id AND qsr.problem_id = qp.id
      LEFT JOIN quiz_problem_options qpo ON qpo.problem_id = qp.id AND qpo.iscorrect = true
      LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
      WHERE qa.id = $1 AND qa.user_id = $2
      ORDER BY qp.question_number ASC
    `;
    const result = await pool.query(query, [attemptId, userId]);
    return result.rows;
  }
}
