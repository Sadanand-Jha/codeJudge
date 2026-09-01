import { RoomStudent } from "@/types/room";

/**
 * Parse a student CSV/Excel export into rows.
 *
 * Add-students now only requires `username` — name/roll are optional and will
 * be derived from the username if missing. This enforces the "username-only"
 * rule for room membership.
 */
export interface CsvRow {
  name: string;
  rollNumber: string;
  username: string;
}

export interface CsvParseResult {
  rows: CsvRow[];
  errors: string[];
  skipped: number;
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === "\t") {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((cell) => cell.trim());
}

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[_\s]+/g, " ").trim();
}

function isHeader(name: string, keys: string[]): boolean {
  const n = normalizeHeader(name);
  return keys.some((k) => n === k || n.startsWith(`${k} `) || n.includes(k));
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9._-]{2,30}$/.test(username);
}

export function parseStudentCsv(text: string): CsvParseResult {
  const rawLines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) return { rows: [], errors: ["The file appears to be empty."], skipped: 0 };

  const headerIndex = isHeader(rawLines[0][0], ["name"]) ? 0 : 0;
  const header = parseCsvLine(rawLines[headerIndex]);
  const dataLines = rawLines.slice(headerIndex + 1);

  const colName = header.findIndex((h) => isHeader(h, ["name", "student", "full name"]));
  const colRoll = header.findIndex((h) => isHeader(h, ["roll", "reg", "enrollment"]));
  const colUsername = header.findIndex((h) => isHeader(h, ["username", "user"]));

  const rows: CsvRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  dataLines.forEach((line, idx) => {
    const cells = parseCsvLine(line);
    const rawName = colName >= 0 ? cells[colName] ?? "" : "";
    const rawRoll = colRoll >= 0 ? cells[colRoll] ?? "" : "";
    const username = colUsername >= 0 ? cells[colUsername] ?? "" : "";

    if (!username) {
      skipped++;
      return;
    }
    if (!isValidUsername(username)) {
      errors.push(`Row ${idx + 1}: invalid username "${username}".`);
    }
    // Derive name/roll from username if missing — keeps RoomStudent valid
    const name = rawName || username;
    const rollNumber = rawRoll || username;
    rows.push({ name, rollNumber, username: username.toLowerCase() });
  });

  return { rows, errors, skipped };
}

/** Convert parsed rows into RoomStudent drafts (no ids yet). */
export function rowsToStudents(rows: CsvRow[], startId = 0): Omit<RoomStudent, "id">[] {
  return rows.map((row, i) => ({
    name: row.name || row.username,
    rollNumber: row.rollNumber || row.username,
    username: row.username,
    active: true,
    avatarId: ((startId + i) % 7) + 1,
  }));
}
