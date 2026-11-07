/**
 * Optional database smoke test for the custom syllabus service.
 *
 * Run after applying migration 75_teacher_syllabus_ownership.sql:
 *   RUN_SYLLABUS_DB_TESTS=1 npm run test:syllabus:db
 *
 * The test creates a temporary syllabus for the first existing user and hard
 * deletes it in a finally block. It is skipped unless explicitly enabled.
 */
import { strict as assert } from "node:assert";
import { pool } from "../config/database.ts";
import {
  createTeacherSyllabus,
  deleteTeacherSyllabus,
  getSyllabusTree,
  getTeacherSyllabi,
  renameTeacherSyllabus,
  searchSyllabusCatalog,
  updateTeacherSyllabus,
} from "../services/customSyllabus.service.ts";
import { SyllabusServiceError } from "../services/syllabusSchema.ts";

const run = process.env.RUN_SYLLABUS_DB_TESTS === "1";

async function main() {
  if (!run) {
    console.log("Custom syllabus DB: skipped (set RUN_SYLLABUS_DB_TESTS=1 to run).");
    await pool.end();
    return;
  }

  const column = await pool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'subjects'
        AND column_name = 'owned_by'`
  );
  if (column.rows.length === 0) {
    console.log("Custom syllabus DB: skipped (migration 75 is not applied).");
    await pool.end();
    return;
  }

  const user = await pool.query("SELECT id FROM users ORDER BY id LIMIT 1");
  if (user.rows.length === 0) {
    console.log("Custom syllabus DB: skipped (no users found).");
    await pool.end();
    return;
  }

  const teacherId = Number(user.rows[0].id);
  const uniqueName = `Syllabus DB Test ${Date.now()}`;
  let createdId: number | null = null;

  try {
    const created = await createTeacherSyllabus(teacherId, {
      name: uniqueName,
      subject: "Computer Science",
      board: "CBSE",
      classLevel: "Class 11",
      chapters: [
        { title: "Arrays", topics: ["Traversal", "Insertion"] },
        { title: "Stacks", topics: ["Push", "Pop"] },
      ],
    });
    createdId = created.id;
    assert.equal(created.scope, "teacher");
    assert.equal(created.chapters.length, 2);
    assert.equal(created.chapters[0].topics.length, 2);
    console.log("✓ create + tree");

    const list = await getTeacherSyllabi(teacherId, uniqueName);
    assert.equal(list.length, 1);
    assert.equal(list[0].chapterCount, 2);
    assert.equal(list[0].topicCount, 4);
    console.log("✓ list counts");

    const search = await searchSyllabusCatalog(teacherId, {
      query: uniqueName,
      type: "syllabus",
    });
    assert.equal(search.length, 1);
    assert.equal(search[0].scope, "teacher");
    assert.equal(search[0].owned, true);
    console.log("✓ unified search");

    const hidden = await searchSyllabusCatalog(teacherId + 100_000, {
      query: uniqueName,
      type: "syllabus",
    });
    assert.equal(hidden.length, 0);
    console.log("✓ ownership isolation");

    const updated = await updateTeacherSyllabus(teacherId, created.id, {
      name: uniqueName,
      subject: "Computer Science",
      status: "draft",
      chapters: [
        { title: "Arrays", topics: ["Traversal", "Insertion", "Searching"] },
        { title: "Stacks", topics: ["Push", "Pop"] },
        { title: "Queues", topics: ["Enqueue"] },
      ],
    });
    assert.equal(updated.status, "draft");
    assert.equal(updated.chapters.length, 3);
    assert.equal(updated.chapters[0].topics.length, 3);
    console.log("✓ update tree");

    const renamedName = `${uniqueName} renamed`;
    const renamed = await renameTeacherSyllabus(teacherId, created.id, renamedName);
    assert.equal(renamed.name, renamedName);
    console.log("✓ rename");

    await deleteTeacherSyllabus(teacherId, created.id);
    await assert.rejects(
      () => getSyllabusTree(created.id, teacherId),
      (error) => error instanceof SyllabusServiceError && error.statusCode === 404
    );
    console.log("✓ soft delete");
  } finally {
    if (createdId != null) {
      await pool.query("DELETE FROM subjects WHERE id = $1", [createdId]).catch(() => undefined);
    }
    await pool.end();
  }

  console.log("Custom syllabus DB: all checks passed.");
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => undefined);
  process.exitCode = 1;
});
