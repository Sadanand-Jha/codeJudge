/**
 * Prisma-equivalent model for quiz_game_config (1:1 with Quiz).
 * In this codebase we use raw `pg` instead of Prisma Client, but the shape
 * mirrors what a Prisma schema entry would look like:
 *
 * model Quiz {
 *   id        Int             @id @default(autoincrement())
 *   ...
 *   gameConfig QuizGameConfig?
 * }
 *
 * model QuizGameConfig {
 *   id               Int      @id @default(autoincrement())
 *   quizId           Int      @unique @map("quiz_id")
 *   enabled          Boolean  @default(true)
 *   movementEnabled  Boolean  @default(true)  @map("movement_enabled")
 *   movementSpeed    Int      @default(5)     @map("movement_speed")
 *   lives            Int      @default(3)
 *   pointsEnabled    Boolean  @default(true)  @map("points_enabled")
 *   powerupsEnabled  Boolean  @default(false) @map("powerups_enabled")
 *   respawnEnabled   Boolean  @default(true)  @map("respawn_enabled")
 *   damageEnabled    Boolean  @default(false) @map("damage_enabled")
 *   createdAt        DateTime @default(now()) @map("created_at")
 *   updatedAt        DateTime @updatedAt      @map("updated_at")
 *
 *   quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
 *
 *   @@map("quiz_game_config")
 * }
 */

export interface QuizGameConfigRow {
  id: number;
  quiz_id: number;
  enabled: boolean;
  movement_enabled: boolean;
  movement_speed: number;
  lives: number;
  points_enabled: boolean;
  powerups_enabled: boolean;
  respawn_enabled: boolean;
  damage_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizGameConfig {
  quizId: number;
  enabled: boolean;
  movementEnabled: boolean;
  movementSpeed: number;
  lives: number;
  pointsEnabled: boolean;
  powerupsEnabled: boolean;
  respawnEnabled: boolean;
  damageEnabled: boolean;
}

export const DEFAULT_QUIZ_GAME_CONFIG: Omit<QuizGameConfig, "quizId"> = {
  enabled: true,
  movementEnabled: true,
  movementSpeed: 5,
  lives: 3,
  pointsEnabled: true,
  powerupsEnabled: false,
  respawnEnabled: true,
  damageEnabled: false,
};

export function mapRowToConfig(row: QuizGameConfigRow): QuizGameConfig {
  return {
    quizId: row.quiz_id,
    enabled: row.enabled,
    movementEnabled: row.movement_enabled,
    movementSpeed: row.movement_speed,
    lives: row.lives,
    pointsEnabled: row.points_enabled,
    powerupsEnabled: row.powerups_enabled,
    respawnEnabled: row.respawn_enabled,
    damageEnabled: row.damage_enabled,
  };
}
