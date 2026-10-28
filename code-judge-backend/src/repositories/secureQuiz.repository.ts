// Data access for client-side encrypted quiz payloads. Only ciphertext,
// wrapped keys, and non-secret metadata are stored here.
import { pool } from "../config/database.ts";

export interface EncryptedBlobRow {
  iv: string;
  ct: string;
}

export interface SecureQuizPayloadInput {
  payloadId: string;
  version: number;
  algorithm: string;
  questions: EncryptedBlobRow;
  problemHtml: EncryptedBlobRow;
  wrappedKey: EncryptedBlobRow;
  keyFingerprint: string;
}

export interface SecureQuizPayloadRow {
  serverQuizId: number;
  quizId: string;
  version: number;
  algorithm: string;
  questions: EncryptedBlobRow;
  problemHtml: EncryptedBlobRow;
  wrappedKey: EncryptedBlobRow;
  keyFingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecureQuizPayloadMetaRow {
  quizId: number;
  payloadId: string;
  version: number;
  algorithm: string;
  keyFingerprint: string;
  createdAt: string;
  updatedAt: string;
}

const META_COLUMNS = `
  quiz_id       AS "quizId",
  payload_id    AS "payloadId",
  version,
  algorithm,
  key_fingerprint AS "keyFingerprint",
  created_at    AS "createdAt",
  updated_at    AS "updatedAt"
`;

const FULL_COLUMNS = `
  quiz_id           AS "serverQuizId",
  payload_id        AS "quizId",
  version,
  algorithm,
  key_fingerprint   AS "keyFingerprint",
  created_at        AS "createdAt",
  updated_at        AS "updatedAt",
  questions_blob    AS questions,
  problem_html_blob AS "problemHtml",
  wrapped_key       AS "wrappedKey"
`;

export class SecureQuizRepository {
  async upsert(
    quizId: number,
    createdBy: number,
    input: SecureQuizPayloadInput
  ): Promise<SecureQuizPayloadMetaRow> {
    const result = await pool.query(
      `
      INSERT INTO quiz_secure_payloads (
        quiz_id, created_by, payload_id, version, algorithm,
        questions_blob, problem_html_blob, wrapped_key, key_fingerprint
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)
      ON CONFLICT (quiz_id) DO UPDATE SET
        created_by        = EXCLUDED.created_by,
        payload_id        = EXCLUDED.payload_id,
        version           = EXCLUDED.version,
        algorithm         = EXCLUDED.algorithm,
        questions_blob    = EXCLUDED.questions_blob,
        problem_html_blob = EXCLUDED.problem_html_blob,
        wrapped_key       = EXCLUDED.wrapped_key,
        key_fingerprint   = EXCLUDED.key_fingerprint,
        updated_at        = NOW()
      RETURNING ${META_COLUMNS}
      `,
      [
        quizId,
        createdBy,
        input.payloadId,
        input.version,
        input.algorithm,
        JSON.stringify(input.questions),
        JSON.stringify(input.problemHtml),
        JSON.stringify(input.wrappedKey),
        input.keyFingerprint,
      ]
    );
    return result.rows[0];
  }

  async getByQuizId(quizId: number): Promise<SecureQuizPayloadRow | null> {
    const result = await pool.query(
      `
      SELECT ${FULL_COLUMNS}
      FROM quiz_secure_payloads
      WHERE quiz_id = $1
      `,
      [quizId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getMetaByQuizId(
    quizId: number
  ): Promise<SecureQuizPayloadMetaRow | null> {
    const result = await pool.query(
      `
      SELECT ${META_COLUMNS}
      FROM quiz_secure_payloads
      WHERE quiz_id = $1
      `,
      [quizId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async deleteByQuizId(quizId: number): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM quiz_secure_payloads WHERE quiz_id = $1",
      [quizId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
