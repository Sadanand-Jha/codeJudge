// User Quiz Repository — student-facing data access. Contains quiz browsing,
// registration, attempt management, response saving, submissions, results,
// reviews, leaderboard, and student quiz history.
import { pool } from "../app.ts";

export class UserQuizRepository {
  // ==================== QUIZ BROWSING ====================

  async getAllQuizzes(filters: {
    page?: number; limit?: number; search?: string;
    status?: string; visibility?: number; difficulty?: number;
    sortBy?: string; sortOrder?: string; userId?: number;
  }): Promise<{ quizzes: any[]; total: number }> {
    const {
      page = 1, limit = 10, search = "", status, visibility, difficulty,
      sortBy = "created_at", sortOrder = "DESC", userId,
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
    if (status) { paramCount++; conditions.push(`qs.name = $${paramCount}`); queryParams.push(status); }
    if (visibility !== undefined) { paramCount++; conditions.push(`q.visibility = $${paramCount}`); queryParams.push(visibility); }
    if (difficulty !== undefined) { paramCount++; conditions.push(`q.difficulty = $${paramCount}`); queryParams.push(difficulty); }
    if (userId) { paramCount++; conditions.push(`q.createdby = $${paramCount}`); queryParams.push(userId); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await pool.query(`SELECT COUNT(*) FROM quiz q ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].count);

    paramCount++; queryParams.push(limit);
    paramCount++; queryParams.push(offset);

    const allowedSortFields = ["name", "code", "created_at", "starttime", "total_marks"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const query = `
      SELECT q.id, q.name, q.code, q.createdby, q.starttime, q.visibility, q.difficulty,
        q.subject_id, q.exam_cat, q.duration, q.total_marks, q.passing_marks,
        q.shuffle_questions, q.shuffle_options, q.show_results_immediately,
        q.negative_marking, q.leaderboard, qs.name AS status, q.created_at, q.updated_at,
        u.username AS creator_name, qv.heading AS visibility_name, qd.heading AS difficulty_name,
        COUNT(DISTINCT qr.id) AS participants, COUNT(DISTINCT qp.id) AS total_questions,
        COALESCE(AVG(CASE WHEN qsr.answer IS NOT NULL THEN 1 ELSE 0 END), 0) AS completion_rate
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_difficulty qd ON qd.id = q.difficulty
      LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      LEFT JOIN quiz_registration qr ON qr.quiz_id = q.id AND qr.is_registered = true
      LEFT JOIN quiz_problems qp ON qp.quiz_id = q.id
      LEFT JOIN quiz_attempt qa_attempt ON qa_attempt.quiz_id = q.id AND qa_attempt.user_id = qr.user_id
      LEFT JOIN quiz_student_response qsr ON qsr.attempt_id = qa_attempt.id AND qsr.problem_id = qp.id
      ${whereClause}
      GROUP BY q.id, u.username, qv.heading, qd.heading, qs.name
      ORDER BY q.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;
    const result = await pool.query(query, queryParams);
    return { quizzes: result.rows, total };
  }

  async getQuizById(quizId: string): Promise<any | null> {
    const result = await pool.query(`
      SELECT q.id, q.name, q.code, q.createdby, q.starttime, q.endtime,
        q.visibility, q.difficulty, q.subject_id, q.exam_cat, q.duration,
        q.total_marks, q.passing_marks, q.shuffle_questions, q.shuffle_options,
        q.show_results_immediately, q.negative_marking, q.leaderboard,
        qs.name AS status, q.created_at, q.updated_at,
        u.username AS creator_name, qv.heading AS visibility_name, qd.heading AS difficulty_name
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_difficulty qd ON qd.id = q.difficulty
      LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      WHERE q.id = $1
    `, [quizId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getQuizByCode(code: string): Promise<any | null> {
    const result = await pool.query(`
      SELECT q.id, q.name, q.code, q.createdby, q.starttime, q.endtime,
        q.visibility, q.difficulty, q.subject_id, q.exam_cat, q.duration,
        q.total_marks, q.passing_marks, q.shuffle_questions, q.shuffle_options,
        q.show_results_immediately, q.negative_marking, q.leaderboard,
        qs.name AS status, q.created_at, q.updated_at,
        u.username AS creator_name, qv.heading AS visibility_name, qd.heading AS difficulty_name
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_difficulty qd ON qd.id = q.difficulty
      LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      WHERE q.code = $1
    `, [code]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async generateUniqueCode(): Promise<string> {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    let exists = true;
    while (exists) {
      code = "";
      for (let i = 0; i < 16; i++) { code += chars[Math.floor(Math.random() * chars.length)]; }
      const result = await pool.query("SELECT 1 FROM quiz WHERE code = $1 LIMIT 1", [code]);
      exists = result.rows.length > 0;
    }
    return code;
  }

  // ==================== PROBLEMS / OPTIONS ====================

  async getQuizProblems(quizId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT qp.id, qp.quiz_id, qp.problem_statement, qp.problem_description,
        qp.quiz_problem_type, qpt.name AS problem_type_name, qp.question_number,
        qp.explaination, qp.hint, qp.difficulty, qp.reference_notes, qp.internal_comments,
        qd.heading AS difficulty_name, qp.created_at, qp.updated_at
      FROM quiz_problems qp
      LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
      LEFT JOIN quiz_difficulty qd ON qd.id = qp.difficulty
      WHERE qp.quiz_id = $1 ORDER BY qp.question_number ASC, qp.id ASC
    `, [quizId]);
    return result.rows;
  }

  async getQuizProblemOptions(problemId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT qpo.id, qpo.problem_id, qpo.option_statement, qpo.option_description,
        qpo.matching_target, qpo.iscorrect, qpo.created_at, qpo.updated_at
      FROM quiz_problem_options qpo WHERE qpo.problem_id = $1 ORDER BY qpo.id ASC
    `, [problemId]);
    return result.rows;
  }

  // ==================== REGISTRATION ====================

  async isUserRegistered(userId: string, quizId: string): Promise<boolean> {
    const result = await pool.query(
      "SELECT 1 FROM quiz_registration WHERE user_id = $1 AND quiz_id = $2 AND is_registered = true LIMIT 1",
      [userId, quizId]
    );
    return result.rows.length > 0;
  }

  async registerUser(userId: string, quizId: string, rollno?: string): Promise<any> {
    const result = await pool.query(
      `INSERT INTO quiz_registration (user_id, quiz_id, is_registered, rollno, created_at, updated_at)
       VALUES ($1,$2,true,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, quiz_id) DO UPDATE SET is_registered=true, rollno=$3, updated_at=CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, quizId, rollno || null]
    );
    return result.rows[0];
  }

  async getUserQuizzes(userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT q.id, q.name, q.code, q.starttime, q.endtime, q.total_marks, q.passing_marks,
        q.leaderboard, qs.name AS status, q.visibility, qv.heading AS visibility_name,
        qr.is_registered, qr.rollno, qr.created_at AS registered_at,
        qa.id AS attempt_id, qa.score, qa.percentage, qa.rank, qa.status AS attempt_status,
        qa.completed_at, qa.time_taken, qa.total_questions, qa.correct_answers, qa.wrong_answers, qa.skipped_questions
      FROM quiz_registration qr
      JOIN quiz q ON q.id = qr.quiz_id
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      LEFT JOIN quiz_attempt qa ON qa.quiz_id = q.id AND qa.user_id = qr.user_id
      WHERE qr.user_id = $1 ORDER BY q.starttime DESC
    `, [userId]);
    return result.rows;
  }

  // ==================== ATTEMPTS ====================

  async checkQuizAccess(userId: number, quizId: number): Promise<{ allowed: boolean; reason?: string; attemptId?: number }> {
    const quiz = await pool.query(
      `SELECT q.*, qs.name AS status FROM quiz q LEFT JOIN quiz_status qs ON qs.id = q.quiz_status WHERE q.id = $1`,
      [quizId]
    );
    if (!quiz.rows.length) return { allowed: false, reason: "Quiz not found" };
    const q = quiz.rows[0];
    const status = q.status?.toLowerCase();
    if (status === "ended") return { allowed: false, reason: "Quiz has ended" };
    const now = new Date();
    if (q.starttime && new Date(q.starttime) > now) return { allowed: false, reason: "Quiz has not started yet" };
    if (q.endtime && new Date(q.endtime) < now) return { allowed: false, reason: "Quiz has ended" };

    const registration = await pool.query(
      "SELECT * FROM quiz_registration WHERE user_id = $1 AND quiz_id = $2 AND is_registered = true",
      [userId, quizId]
    );
    if (!registration.rows.length) return { allowed: false, reason: "You are not registered for this quiz" };

    const existingAttempt = await pool.query(
      "SELECT * FROM quiz_attempt WHERE user_id = $1 AND quiz_id = $2 AND status = 'in_progress'",
      [userId, quizId]
    );
    if (existingAttempt.rows.length > 0) return { allowed: true, reason: "resume", attemptId: existingAttempt.rows[0].id };
    return { allowed: true };
  }

  async getQuizAttempt(userId: number, quizId: number): Promise<any | null> {
    const result = await pool.query(
      "SELECT * FROM quiz_attempt WHERE user_id = $1 AND quiz_id = $2 ORDER BY created_at DESC LIMIT 1",
      [userId, quizId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getQuizAttemptById(attemptId: number): Promise<any | null> {
    const result = await pool.query("SELECT * FROM quiz_attempt WHERE id = $1", [attemptId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async createQuizAttempt(data: { userId: number; quizId: number; totalQuestions: number }): Promise<any> {
    const result = await pool.query(
      `INSERT INTO quiz_attempt (user_id, quiz_id, total_questions, status, created_at, updated_at)
       VALUES ($1,$2,$3,'in_progress',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *`,
      [data.userId, data.quizId, data.totalQuestions]
    );
    return result.rows[0];
  }

  async updateQuizAttempt(attemptId: number, data: any): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;
    const updateableFields = [
      "score", "percentage", "rank", "status", "completed_at", "time_taken",
      "total_questions", "correct_answers", "wrong_answers", "skipped_questions",
    ];
    for (const field of updateableFields) {
      if (data[field] !== undefined) { paramCount++; fields.push(`${field} = $${paramCount}`); values.push(data[field]); }
    }
    if (fields.length === 0) return null;
    paramCount++; values.push(attemptId);
    const result = await pool.query(
      `UPDATE quiz_attempt SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`, values
    );
    return result.rows[0];
  }

  // ==================== RESPONSES ====================

  async saveStudentResponse(data: {
    attemptId: number; problemId: number;
    answer?: unknown; option?: string; textAnswer?: string; timeTaken?: number;
  }): Promise<any> {
    let answerJsonb: unknown = data.answer;
    if (answerJsonb === undefined || answerJsonb === null) {
      if (data.option !== undefined && data.option !== null) {
        const numId = Number(data.option);
        if (!isNaN(numId) && numId > 0) { answerJsonb = { type: "MCQ", selectedOptionId: numId }; }
        else { answerJsonb = data.option; }
      } else if (data.textAnswer !== undefined && data.textAnswer !== null) {
        answerJsonb = { type: "TEXT", text: data.textAnswer };
      }
    }
    const result = await pool.query(
      `INSERT INTO quiz_student_response (attempt_id, problem_id, answer, is_attempted, created_at, updated_at)
       VALUES ($1,$2,$3,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT (attempt_id, problem_id) DO UPDATE SET answer=$3, is_attempted=true, updated_at=CURRENT_TIMESTAMP
       RETURNING *`,
      [data.attemptId, data.problemId, answerJsonb ? JSON.stringify(answerJsonb) : null]
    );
    return result.rows[0];
  }

  async getStudentResponses(userId: number, quizId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT qsr.*, qp.problem_statement, qp.quiz_problem_type, qp.question_number
      FROM quiz_student_response qsr
      JOIN quiz_attempt qa ON qa.id = qsr.attempt_id
      JOIN quiz_problems qp ON qp.id = qsr.problem_id
      WHERE qa.user_id = $1 AND qp.quiz_id = $2 ORDER BY qp.question_number ASC
    `, [userId, quizId]);
    return result.rows;
  }

  // ==================== RESULTS & REVIEW ====================

  async getQuizResult(attemptId: number, userId: number): Promise<any | null> {
    const result = await pool.query(`
      SELECT qa.*, q.name, q.code, q.total_marks, q.passing_marks
      FROM quiz_attempt qa JOIN quiz q ON q.id = qa.quiz_id
      WHERE qa.id = $1 AND qa.user_id = $2
    `, [attemptId, userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getQuestionWiseReview(attemptId: number, userId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT qp.id AS problem_id, qp.question_number, qp.problem_statement, qp.problem_description,
        qp.explaination, qp.hint, qpt.name AS problem_type,
        qpo.option_statement AS correct_answer, qsr.answer AS selected_option, qsr.created_at AS answered_at
      FROM quiz_attempt qa
      JOIN quiz_problems qp ON qp.quiz_id = qa.quiz_id
      LEFT JOIN quiz_student_response qsr ON qsr.attempt_id = qa.id AND qsr.problem_id = qp.id
      LEFT JOIN quiz_problem_options qpo ON qpo.problem_id = qp.id AND qpo.iscorrect = true
      LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
      WHERE qa.id = $1 AND qa.user_id = $2 ORDER BY qp.question_number ASC
    `, [attemptId, userId]);
    return result.rows;
  }

  // ==================== LEADERBOARD ====================

  async getQuizLeaderboard(quizId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT qa.user_id, u.username, u.first_name, u.last_name, u.avatar_id, a.url AS avatar_url,
        c.name AS college_name, qa.score, qa.percentage, qa.rank, qa.time_taken, qa.completed_at,
        qa.status, qa.correct_answers, qa.wrong_answers, qa.skipped_questions
      FROM quiz_attempt qa
      JOIN users u ON u.id = qa.user_id
      LEFT JOIN avatar a ON a.id = u.avatar_id
      LEFT JOIN college c ON c.id = u.college_id
      WHERE qa.quiz_id = $1 AND qa.status = 'completed'
      ORDER BY qa.score DESC, qa.time_taken ASC, qa.completed_at ASC
    `, [quizId]);
    return result.rows;
  }

  // ==================== PREVIOUS QUIZZES ====================

  async getPreviousQuizzes(userId: number, filters: {
    page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string;
  }): Promise<{ quizzes: any[]; total: number }> {
    const { page = 1, limit = 10, search = "", sortBy = "completed_at", sortOrder = "DESC" } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = ["qa.user_id = $1"];
    const queryParams: any[] = [userId];
    let paramCount = 1;

    if (search) { paramCount++; conditions.push(`q.name ILIKE $${paramCount}`); queryParams.push(`%${search}%`); }

    const whereClause = conditions.join(" AND ");
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM quiz_attempt qa JOIN quiz q ON q.id = qa.quiz_id WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++; queryParams.push(limit);
    paramCount++; queryParams.push(offset);

    const allowedSortFields = ["score", "percentage", "time_taken", "completed_at"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "completed_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const result = await pool.query(`
      SELECT qa.id AS attempt_id, q.id AS quiz_id, q.name, q.code, q.total_marks, q.passing_marks,
        qa.score, qa.percentage, qa.rank, qa.status, qa.completed_at, qa.time_taken,
        qa.total_questions, qa.correct_answers, qa.wrong_answers, qa.skipped_questions
      FROM quiz_attempt qa JOIN quiz q ON q.id = qa.quiz_id
      WHERE ${whereClause}
      ORDER BY qa.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, queryParams);
    return { quizzes: result.rows, total };
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

  // ==================== COLLABORATORS (user-side) ====================
  // NOTE: quiz_collaborator_request table does not exist yet.

  // async isAcceptedCollaborator(userId: number, quizId: number): Promise<boolean> {
  //   const result = await pool.query(
  //     "SELECT 1 FROM quiz_collaborator_request WHERE quiz_id = $1 AND user_id = $2 AND status = 'accepted' LIMIT 1",
  //     [quizId, userId]
  //   );
  //   return result.rows.length > 0;
  // }

  async getQuizByIdForAttempt(quizId: number): Promise<any | null> {
    const result = await pool.query(`
      SELECT q.*, qv.heading AS visibility_name, qs.name AS status
      FROM quiz q
      LEFT JOIN quiz_visibility qv ON qv.id = q.visibility
      LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
      WHERE q.id = $1 AND qs.name IN ('scheduled', 'live')
    `, [quizId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // ==================== GAME CONFIG (read-only for users) ====================

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

  async getAllGameMechanics(): Promise<any[]> {
    const result = await pool.query("SELECT * FROM game_mechanics WHERE enabled = TRUE ORDER BY id");
    return result.rows.map((row) => ({
      id: row.id, name: row.name, code: row.code, description: row.description,
      icon: row.icon, mechanicType: row.mechanic_type, defaultQuantity: row.default_quantity,
      enabled: row.enabled,
    }));
  }

  async getQuizGameMechanics(quizId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT qgm.*, gm.name, gm.code, gm.description, gm.icon, gm.mechanic_type, gm.default_quantity
       FROM quiz_game_mechanics qgm JOIN game_mechanics gm ON gm.id = qgm.mechanic_id
       WHERE qgm.quiz_id = $1 ORDER BY gm.id`,
      [quizId]
    );
    return result.rows.map((row) => ({
      id: row.id, quizId: row.quiz_id, mechanicId: row.mechanic_id, name: row.name,
      code: row.code, description: row.description, icon: row.icon,
      mechanicType: row.mechanic_type, enabled: row.enabled, quantity: row.quantity,
    }));
  }
}
