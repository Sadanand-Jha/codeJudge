/**
 * Unit tests for custom syllabus validation, dedupe, ownership and file safety.
 *
 * Run: npm run test:syllabus
 * (no database required)
 */
import { strict as assert } from "node:assert";
import {
  assertTeacherOwnsSyllabus,
  generatedSyllabusListSchema,
  generatedSyllabusSchema,
  hasGeneratedContent,
  mergeGeneratedChunks,
  normalizeGeneratedPayload,
  normalizeGeneratedSyllabiPayload,
  normalizeSyllabusInput,
  splitGeneratedSyllabus,
  SyllabusServiceError,
  syllabusInputSchema,
} from "../services/syllabusSchema.ts";
import {
  getSyllabusImportConfig,
  getSyllabusImportCostInfo,
  validateSyllabusUpload,
} from "../services/syllabusBreakdown.service.ts";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

const parseInput = (value: unknown) => syllabusInputSchema.parse(value);

test("duplicate chapters and topics are merged case-insensitively", () => {
  const input = normalizeSyllabusInput(
    parseInput({
      name: "  Algebra  ",
      subject: " Mathematics ",
      chapters: [
        { title: "Linear Equations", topics: ["Variables", "Solving", "variables"] },
        { title: "linear equations", topics: ["Word problems", { title: "Solving" }] },
      ],
    })
  );

  assert.equal(input.name, "Algebra");
  assert.equal(input.subject, "Mathematics");
  assert.equal(input.chapters.length, 1);
  assert.deepEqual(
    input.chapters[0].topics.map((topic) => topic.title),
    ["Variables", "Solving", "Word problems"]
  );
});

test("empty optional metadata is normalized to null", () => {
  const input = normalizeSyllabusInput(
    parseInput({
      name: "Physics",
      subject: "Physics",
      board: " ",
      classLevel: "",
      chapters: [{ title: "Motion", topics: [] }],
    })
  );
  assert.equal(input.board, null);
  assert.equal(input.classLevel, null);
  assert.equal(input.level, null);
  assert.equal(input.status, "active");
});

test("a syllabus with no usable chapters is rejected", () => {
  assert.throws(
    () =>
      normalizeSyllabusInput({
        name: "Empty",
        subject: "Empty",
        board: null,
        classLevel: null,
        level: null,
        status: "active",
        importJobId: null,
        chapters: [{ title: " ", description: null, topics: [] }],
      }),
    (error) =>
      error instanceof SyllabusServiceError &&
      error.statusCode === 400 &&
      error.code === "INVALID_SYLLABUS"
  );
});

test("the owner can edit their own teacher syllabus", () => {
  assert.doesNotThrow(() =>
    assertTeacherOwnsSyllabus(
      { id: 10, owner_teacher_id: 7, scope: "teacher", deleted_at: null },
      7
    )
  );
});

test("system syllabi are hidden from teachers", () => {
  const row = { id: 1, owner_teacher_id: null, scope: "system" as const, deleted_at: null };
  assert.throws(
    () => assertTeacherOwnsSyllabus(row, 7),
    (error) => error instanceof SyllabusServiceError && error.statusCode === 404
  );
});

test("another teacher's syllabus is hidden and deleted rows return 404", () => {
  const other = { id: 12, owner_teacher_id: 8, scope: "teacher" as const, deleted_at: null };
  assert.throws(
    () => assertTeacherOwnsSyllabus(other, 7),
    (error) => error instanceof SyllabusServiceError && error.statusCode === 404
  );
  assert.throws(
    () =>
      assertTeacherOwnsSyllabus(
        { ...other, owner_teacher_id: 7, deleted_at: new Date() },
        7
      ),
    (error) => error instanceof SyllabusServiceError && error.statusCode === 404
  );
});

test("chunk merges dedupe repeated chapters and topics across parts", () => {
  const merged = mergeGeneratedChunks([
    {
      name: "Data Structures",
      subject: "Computer Science",
      board: null,
      classLevel: null,
      level: null,
      chapters: [
        { title: "Arrays", description: "Basics", topics: ["Traversal", "Insertion"] },
        { title: "Stacks", description: null, topics: ["Push", "Pop"] },
      ],
    },
    {
      name: "",
      subject: "",
      board: "CBSE",
      classLevel: null,
      level: null,
      chapters: [
        { title: "arrays", description: null, topics: ["Traversal", "Searching"] },
        { title: "Queues", description: null, topics: ["Enqueue"] },
      ],
    },
  ]);

  assert.equal(merged.name, "Data Structures");
  assert.equal(merged.subject, "Computer Science");
  assert.equal(merged.board, "CBSE");
  assert.deepEqual(
    merged.chapters.map((chapter) => chapter.title),
    ["Arrays", "Stacks", "Queues"]
  );
  assert.deepEqual(
    merged.chapters[0].topics.map((topic) =>
      typeof topic === "string" ? topic : topic.title
    ),
    ["Traversal", "Insertion", "Searching"]
  );
  assert.equal(hasGeneratedContent(merged), true);
});

test("alternate model shapes are normalized into a usable hierarchy", () => {
  const multi = generatedSyllabusSchema.parse(
    normalizeGeneratedPayload({
      courses: [
        {
          course_name: "Artificial Intelligence",
          chapters: [{ title: "Introduction", topics: ["Definition", "Search"] }],
        },
        {
          course_name: "Digital Circuits",
          chapters: [{ title: "Introduction", topics: ["Boolean Algebra"] }],
        },
      ],
    })
  );
  assert.equal(multi.subject, "Artificial Intelligence, Digital Circuits");
  assert.equal(multi.chapters.length, 2);
  assert.equal(multi.chapters[0].title, "Artificial Intelligence: Introduction");
  assert.equal(multi.chapters[1].title, "Digital Circuits: Introduction");

  const single = generatedSyllabusSchema.parse(
    normalizeGeneratedPayload({
      courses: [
        {
          course_name: "Operating Systems",
          chapters: [{ title: "Processes", topics: [{ name: "Scheduling" }] }],
        },
      ],
    })
  );
  assert.equal(single.name, "Operating Systems");
  assert.equal(single.subject, "Operating Systems");
  assert.deepEqual(single.chapters[0].topics, ["Scheduling"]);
});

test("null generated metadata is accepted", () => {
  const parsed = generatedSyllabusSchema.parse(
    normalizeGeneratedPayload({
      name: null,
      subject: null,
      board: null,
      classLevel: null,
      level: null,
      chapters: [{ title: "Introduction", description: null, topics: ["Basics"] }],
    })
  );
  assert.equal(parsed.name, "");
  assert.equal(parsed.subject, "");
  assert.equal(parsed.chapters.length, 1);
});

test("empty chapter topics are derived from descriptions", () => {
  const parsed = generatedSyllabusSchema.parse(
    normalizeGeneratedPayload({
      name: "Artificial Intelligence",
      subject: "Computer Science",
      chapters: [
        {
          title: "Introduction",
          description: "Definition, Foundation, History. Problem Solving - Search",
          topics: [],
        },
      ],
    })
  );
  assert.deepEqual(
    parsed.chapters[0].topics.map((topic) => (typeof topic === "string" ? topic : topic.title)),
    ["Definition", "Foundation", "History", "Problem Solving", "Search"]
  );
});

test("multi-syllabus envelopes stay as separate entries", () => {
  const parsed = generatedSyllabusListSchema.parse(
    normalizeGeneratedSyllabiPayload({
      courses: [
        {
          course_name: "Artificial Intelligence",
          chapters: [
            { title: "Introduction", description: "Agents, Search", topics: [] },
          ],
        },
        {
          course_name: "Digital Circuits",
          chapters: [
            { title: "Introduction", description: "Signals, Gates", topics: [] },
          ],
        },
      ],
    })
  );
  assert.equal(parsed.syllabi.length, 2);
  assert.deepEqual(
    parsed.syllabi.map((syllabus) => syllabus.name),
    ["Artificial Intelligence", "Digital Circuits"]
  );
  assert.equal(parsed.syllabi[0].chapters[0].topics.length, 2);
});

test("multi-course prefixed chapters become separate syllabi", () => {
  const parts = splitGeneratedSyllabus({
    name: "Combined document",
    subject: "Computer Science",
    board: null,
    classLevel: null,
    level: null,
    chapters: [
      { title: "Artificial Intelligence: Introduction", description: null, topics: [{ title: "Agents" }] },
      { title: "Artificial Intelligence: Search", description: null, topics: [{ title: "A*" }] },
      { title: "Digital Circuits: Introduction", description: null, topics: [{ title: "Signals" }] },
      { title: "Digital Circuits: Logic", description: null, topics: [{ title: "Gates" }] },
    ],
  });
  assert.equal(parts.length, 2);
  assert.deepEqual(
    parts.map((part) => part.name),
    ["Artificial Intelligence", "Digital Circuits"]
  );
  assert.deepEqual(
    parts[0].chapters.map((chapter) => chapter.title),
    ["Introduction", "Search"]
  );

  const single = splitGeneratedSyllabus({
    name: "Data Structures",
    subject: "Computer Science",
    board: null,
    classLevel: null,
    level: null,
    chapters: [
      { title: "Data Structures: Arrays", description: null, topics: [{ title: "Traversal" }] },
      { title: "Data Structures: Stacks", description: null, topics: [{ title: "Push" }] },
    ],
  });
  assert.equal(single.length, 1);

  const numbered = splitGeneratedSyllabus({
    name: "Physics",
    subject: "Physics",
    board: null,
    classLevel: null,
    level: null,
    chapters: [
      { title: "Unit 1: Motion", description: null, topics: [{ title: "Speed" }] },
      { title: "Unit 2: Force", description: null, topics: [{ title: "Newton" }] },
    ],
  });
  assert.equal(numbered.length, 1);
});

test("chapters without topics are dropped from generated output", () => {
  const merged = mergeGeneratedChunks([
    {
      name: "Empty",
      subject: "Empty",
      board: null,
      classLevel: null,
      level: null,
      chapters: [{ title: "No topics", description: null, topics: [] }],
    },
  ]);
  assert.equal(merged.chapters.length, 0);
  assert.equal(hasGeneratedContent(merged), false);
});

test("upload validation accepts a valid PDF and rejects unsafe files", () => {
  const config = getSyllabusImportConfig();
  const valid = validateSyllabusUpload({
    originalname: "syllabus.pdf",
    mimetype: "application/pdf",
    size: 8,
    buffer: Buffer.from("%PDF-1.4"),
  });
  assert.equal(valid.extension, ".pdf");
  assert.equal(valid.filename, "syllabus.pdf");

  assert.throws(
    () =>
      validateSyllabusUpload({
        originalname: "syllabus.md",
        mimetype: "text/markdown",
        size: 4,
        buffer: Buffer.from("# hi"),
      }),
    (error) => error instanceof SyllabusServiceError && error.code === "UNSUPPORTED_FILE_TYPE"
  );

  assert.throws(
    () =>
      validateSyllabusUpload({
        originalname: "syllabus.pdf",
        mimetype: "text/plain",
        size: 8,
        buffer: Buffer.from("%PDF-1.4"),
      }),
    (error) => error instanceof SyllabusServiceError && error.code === "MIME_MISMATCH"
  );

  assert.throws(
    () =>
      validateSyllabusUpload({
        originalname: "syllabus.pdf",
        mimetype: "application/pdf",
        size: 8,
        buffer: Buffer.from("not a pdf"),
      }),
    (error) => error instanceof SyllabusServiceError && error.code === "INVALID_FILE"
  );

  assert.throws(
    () =>
      validateSyllabusUpload({
        originalname: "syllabus.txt",
        mimetype: "text/plain",
        size: config.maxBytes + 1,
        buffer: Buffer.from("x"),
      }),
    (error) => error instanceof SyllabusServiceError && error.statusCode === 413
  );
});

test("import cost info exposes the configured fixed price", () => {
  const info = getSyllabusImportCostInfo();
  assert.ok(Number.isInteger(info.creditCost) && info.creditCost > 0);
  assert.deepEqual(info.allowedExtensions.sort(), [".docx", ".pdf", ".txt"]);
});

console.log(`Custom syllabus: ${passed} checks passed.`);
