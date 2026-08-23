import { Room, RoomStudent } from "@/types/room";

/**
 * Deterministic seed data for the demo room system.
 *
 * Rooms are stored in localStorage (via `roomStore`) so a teacher can create,
 * edit and archive rooms that persist between sessions. In production the
 * `roomStore` would be backed by a real API — see `src/services/rooms.ts`.
 */

const FIRST_NAMES = [
  "Rahul", "Priya", "Amit", "Sneha", "Vikram", "Ananya", "Rohit", "Neha",
  "Karan", "Pooja", "Arjun", "Riya", "Siddharth", "Ishita", "Manish", "Divya",
  "Rakesh", "Kavya", "Nikhil", "Shreya", "Aditya", "Tanvi", "Varun", "Meera",
  "Saurabh", "Pallavi", "Harsh", "Aishwarya", "Deepak", "Swati",
];

const LAST_NAMES = [
  "Kumar", "Sharma", "Verma", "Patel", "Singh", "Gupta", "Yadav", "Reddy",
  "Nair", "Iyer", "Das", "Mehta", "Chopra", "Bose", "Kulkarni", "Joshi",
  "Mishra", "Agarwal", "Pandey", "Chaudhary", "Malhotra", "Bhatt", "Desai",
  "Kapoor", "Rana", "Sethi", "Tiwari", "Dubey", "Saxena", "Thakur",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeedStudent {
  name: string;
  rollNumber: string;
  username: string;
  avatarId: number;
  active: boolean;
}

/**
 * Deterministically generate `count` students for a room so the demo data is
 * stable across reloads while still looking like a real class list.
 */
function generateStudents(roomKey: string, prefix: string, count: number, startIndex: number, year: string): RoomStudent[] {
  const rand = mulberry32(hashString(roomKey));
  const picked = new Set<number>();
  const students: SeedStudent[] = [];
  let guard = 0;
  while (students.length < count && guard < count * 10) {
    guard++;
    const fi = Math.floor(rand() * FIRST_NAMES.length);
    const li = Math.floor(rand() * LAST_NAMES.length);
    const seedIndex = hashString(`${roomKey}:${students.length}:${fi}:${li}`) % 999;
    if (picked.has(seedIndex)) continue;
    picked.add(seedIndex);
    const roll = `${prefix}${year}${String(startIndex + students.length).padStart(3, "0")}`;
    const firstName = FIRST_NAMES[fi];
    const lastName = LAST_NAMES[li];
    students.push({
      name: `${firstName} ${lastName}`,
      rollNumber: roll,
      username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${String(seedIndex).slice(0, 2)}`,
      avatarId: (seedIndex % 7) + 1,
      active: rand() > 0.08,
    });
  }
  // Keep roll numbers unique even if the loop padded above count.
  const seen = new Set<string>();
  const out: RoomStudent[] = [];
  let i = 0;
  for (const s of students) {
    const roll = `${prefix}${year}${String(startIndex + i).padStart(3, "0")}`;
    if (seen.has(roll)) continue;
    seen.add(roll);
    out.push({
      id: `${roomKey}_stu_${i}`,
      name: s.name,
      rollNumber: roll,
      username: s.username,
      active: s.active,
      avatarId: s.avatarId,
    });
    i++;
  }
  return out;
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_ROOMS: Room[] = [
  {
    id: "room_cse_a",
    name: "CSE-A",
    description: "CSE 3rd Year, Section A",
    createdAt: daysAgo(210),
    updatedAt: daysAgo(2),
    archived: false,
    students: generateStudents("room_cse_a", "CSE", 62, 1001, "23"),
  },
  {
    id: "room_cse_b",
    name: "CSE-B",
    description: "CSE 3rd Year, Section B",
    createdAt: daysAgo(209),
    updatedAt: daysAgo(1),
    archived: false,
    students: generateStudents("room_cse_b", "CSE", 58, 1101, "23"),
  },
  {
    id: "room_cse_3rd",
    name: "CSE 3rd Year",
    description: "All third year CSE students across both sections",
    createdAt: daysAgo(205),
    updatedAt: daysAgo(3),
    archived: false,
    students: generateStudents("room_cse_3rd", "CSE", 84, 2001, "23"),
  },
  {
    id: "room_dsa_morning",
    name: "DSA Morning Batch",
    description: "Data Structures morning batch — Mon/Wed/Fri 9 AM",
    createdAt: daysAgo(120),
    updatedAt: daysAgo(5),
    archived: false,
    students: generateStudents("room_dsa_morning", "DSA", 32, 3001, "24"),
  },
  {
    id: "room_dsa_evening",
    name: "DSA Evening Batch",
    description: "Data Structures evening batch — Tue/Thu 5 PM",
    createdAt: daysAgo(118),
    updatedAt: daysAgo(6),
    archived: false,
    students: generateStudents("room_dsa_evening", "DSA", 28, 3101, "24"),
  },
  {
    id: "room_sem5",
    name: "Semester 5",
    description: "All students in Semester 5 of the current academic year",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(8),
    archived: false,
    students: generateStudents("room_sem5", "SEM5", 96, 4001, "23"),
  },
  {
    id: "room_lab_g1",
    name: "Lab Group 1",
    description: "Operating Systems lab, Group 1",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
    archived: false,
    students: generateStudents("room_lab_g1", "LAB", 24, 5001, "24"),
  },
  {
    id: "room_archived_2023",
    name: "CSE 2022 Batch",
    description: "Graduated batch — kept for reference",
    createdAt: daysAgo(600),
    updatedAt: daysAgo(300),
    archived: true,
    students: generateStudents("room_archived_2023", "CSE", 0, 6001, "22"),
  },
];

/** Fresh empty room for the archive room entry (no students). */
export const EMPTY_ROOM_STUDENTS: RoomStudent[] = [];
