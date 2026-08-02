import { pool } from "../app.ts";

export class QuizRepository {
  /**
   * Get all quizzes
   */
  async getAllQuizzes(): Promise<any[]> {
    const query = `
      SELECT
        q.id,
        q.name,
        q.code,
        q.createdby,
        q.starttime,
        q.endtime,
        q.created_at,
        q.updated_at,
        u.username AS creator_name
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      ORDER BY q.starttime DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get a single quiz by ID
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
        q.created_at,
        q.updated_at,
        u.username AS creator_name
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      WHERE q.id = $1
    `;
    const result = await pool.query(query, [quizId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get a quiz by its code
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
        q.created_at,
        q.updated_at,
        u.username AS creator_name
      FROM quiz q
      LEFT JOIN users u ON u.id = q.createdby
      WHERE q.code = $1
    `;
    const result = await pool.query(query, [code]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all problems for a quiz
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
        qp.created_at,
        qp.updated_at
      FROM quiz_problems qp
      LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
      WHERE qp.quiz_id = $1
      ORDER BY qp.id ASC
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
   * Get user's quiz registrations
   */
  async getUserQuizzes(userId: string): Promise<any[]> {
    const query = `
      SELECT
        q.id,
        q.name,
        q.code,
        q.starttime,
        q.endtime,
        qr.is_registered,
        qr.rollno,
        qr.created_at AS registered_at
      FROM quiz_registration qr
      JOIN quiz q ON q.id = qr.quiz_id
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
  }): Promise<any> {
    const query = `
      INSERT INTO quiz (name, code, createdby, starttime, endtime, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.name,
      data.code,
      data.createdby,
      data.starttime || null,
      data.endtime || null,
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
  }): Promise<any> {
    const query = `
      INSERT INTO quiz_problems (quiz_id, problem_statement, problem_description, quiz_problem_type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.quizId,
      data.problemStatement,
      data.problemDescription || null,
      data.quizProblemType || null,
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
}