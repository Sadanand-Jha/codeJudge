# Frontend ↔ Backend Connection Notes

This document tracks the mapping between frontend data needs and the backend database schema.
Any column that the frontend requires but is **NOT present** in the database is documented here
so it can be added via a future migration.

---

## Contest

### DB Table: `contest`
| Column | Type | Present? | Notes |
|--------|------|----------|-------|
| id | SERIAL | ✅ | |
| name | VARCHAR | ✅ | |
| starttime | TIMESTAMP | ✅ | |
| duration | INTEGER | ✅ | |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

### DB Table: `contest_registeration`
| Column | Type | Present? | Notes |
|--------|------|----------|-------|
| id | SERIAL | ✅ | |
| user_id | INTEGER | ✅ | |
| is_registered | BOOLEAN | ✅ | |
| rated | BOOLEAN | ✅ | |
| createdat | TIMESTAMP | ✅ | |
| updatedat | TIMESTAMP | ✅ | |
| **contest_id** | INTEGER | ❌ **MISSING** | **Required to link a registration to a specific contest.** Currently the table has no way to know which contest a user registered for. Needs migration: `ALTER TABLE contest_registeration ADD COLUMN contest_id INTEGER REFERENCES contest(id);` |

### Frontend fields NOT in DB (need migration)
| Frontend Field | Needed For | Suggested Column |
|----------------|-----------|------------------|
| `participants` / `registered_count` | Contest card "X registered" | Computed via `COUNT(*)` on `contest_registeration` (once `contest_id` exists) |
| `startsIn` | Countdown display | Computed from `starttime` |
| `rank` | Past contest "Your Rank" | No table exists for contest results/rankings. Needs new table `contest_result` |
| `date` | Past contest date | Computed from `starttime` |

---

## Quiz

### DB Table: `quiz`
| Column | Type | Present? | Notes |
|--------|------|----------|-------|
| id | SERIAL | ✅ | |
| name | VARCHAR | ✅ | Maps to frontend `title` |
| code | VARCHAR | ✅ | |
| createdby | INTEGER | ✅ | Maps to `creatorId` |
| starttime | TIMESTAMP | ✅ | Maps to `startTime` |
| endtime | TIMESTAMP | ✅ | Maps to `endTime` |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

### Frontend fields NOT in DB (need migration)
| Frontend Field | Needed For | Suggested Column |
|----------------|-----------|------------------|
| `description` | Quiz card / details | `ALTER TABLE quiz ADD COLUMN description TEXT;` |
| `visibility` | Visibility badge | `ALTER TABLE quiz ADD COLUMN visibility VARCHAR DEFAULT 'global';` |
| `status` | Tab filtering (upcoming/active/completed) | Computed from `starttime`/`endtime` |
| `difficulty` | Difficulty badge | `ALTER TABLE quiz ADD COLUMN difficulty VARCHAR;` |
| `tags` | Tag display | `ALTER TABLE quiz ADD COLUMN tags TEXT[];` |
| `totalPoints` | Points display | Computed from `SUM(quiz_problems.points)` (needs `points` column) |
| `timeLimit` | Duration display | `ALTER TABLE quiz ADD COLUMN time_limit INTEGER;` |
| `attemptsAllowed` | Settings | `ALTER TABLE quiz ADD COLUMN attempts_allowed INTEGER DEFAULT 3;` |
| `passingScore` | Settings | `ALTER TABLE quiz ADD COLUMN passing_score INTEGER;` |
| `coverImage` | Card cover | `ALTER TABLE quiz ADD COLUMN cover_image VARCHAR;` |
| `registeredCount` | "X registered" | Computed via `COUNT(*)` on `quiz_registration` |
| `attempts` | Stats | Computed via `COUNT(*)` on attempts table (needs new table) |
| `averageScore` | Stats | Computed from attempts |
| `creatorName` | Display | Join with `users.username` via `createdby` |
| `learningOutcomes` | Details | `ALTER TABLE quiz ADD COLUMN learning_outcomes TEXT[];` |
| `prerequisites` | Details | `ALTER TABLE quiz ADD COLUMN prerequisites TEXT[];` |
| `languagesSupported` | Details | `ALTER TABLE quiz ADD COLUMN languages_supported TEXT[];` |
| `certificateEligible` | Details | `ALTER TABLE quiz ADD COLUMN certificate_eligible BOOLEAN DEFAULT false;` |

### DB Table: `quiz_problems`
| Column | Type | Present? | Notes |
|--------|------|----------|-------|
| id | SERIAL | ✅ | |
| quiz_id | INTEGER | ✅ | |
| problem_statement | VARCHAR | ✅ | Maps to `question` |
| problem_description | VARCHAR | ✅ | |
| quiz_problem_type | INTEGER | ✅ | FK to `quiz_problem_type` |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

### Frontend fields NOT in DB (need migration)
| Frontend Field | Needed For | Suggested Column |
|----------------|-----------|------------------|
| `points` | Question points | `ALTER TABLE quiz_problems ADD COLUMN points INTEGER DEFAULT 10;` |
| `negativeMarks` | Negative marking | `ALTER TABLE quiz_problems ADD COLUMN negative_marks INTEGER DEFAULT 0;` |
| `difficulty` | Question difficulty | `ALTER TABLE quiz_problems ADD COLUMN difficulty VARCHAR;` |
| `explanation` | Explanation | `ALTER TABLE quiz_problems ADD COLUMN explanation TEXT;` |
| `hint` | Hint | `ALTER TABLE quiz_problems ADD COLUMN hint TEXT;` |
| `correctAnswer` | Correct answer | Stored via `quiz_problem_options.iscorrect` |
| `tags` | Question tags | `ALTER TABLE quiz_problems ADD COLUMN tags TEXT[];` |
| `randomizeOptions` | Settings | `ALTER TABLE quiz_problems ADD COLUMN randomize_options BOOLEAN DEFAULT false;` |
| `caseSensitive` | Settings | `ALTER TABLE quiz_problems ADD COLUMN case_sensitive BOOLEAN DEFAULT false;` |
| `shuffleAnswers` | Settings | `ALTER TABLE quiz_problems ADD COLUMN shuffle_answers BOOLEAN DEFAULT false;` |
| `isBonus` | Settings | `ALTER TABLE quiz_problems ADD COLUMN is_bonus BOOLEAN DEFAULT false;` |
| `isMandatory` | Settings | `ALTER TABLE quiz_problems ADD COLUMN is_mandatory BOOLEAN DEFAULT false;` |
| `estimatedTime` | Settings | `ALTER TABLE quiz_problems ADD COLUMN estimated_time INTEGER;` |
| `status` | Question status | Computed |

### DB Table: `quiz_problem_options`
| Column | Type | Present? | Notes |
|--------|------|----------|-------|
| id | SERIAL | ✅ | |
| problem_id | INTEGER | ✅ | |
| option_statement | VARCHAR | ✅ | Maps to `content` |
| option_description | VARCHAR | ✅ | |
| iscorrect | BOOLEAN | ✅ | Maps to `isCorrect` |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

### DB Table: `quiz_registration`
| Column | Type | Present? | Notes |
|--------|------|----------|-------|
| id | SERIAL | ✅ | |
| user_id | INTEGER | ✅ | |
| quiz_id | INTEGER | ✅ | |
| is_registered | BOOLEAN | ✅ | |
| rollno | VARCHAR | ✅ | |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

---

## Missing Tables (need migration)
| Table | Purpose |
|-------|---------|
| `contest_result` | Store contest rankings / user rank per contest |
| `quiz_attempt` | Store quiz attempts, scores, answers, time taken |
| `quiz_bookmark` | Store user bookmarked quizzes |
| `quiz_rating` | Store quiz ratings / reviews |