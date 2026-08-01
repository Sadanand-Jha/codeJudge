# Quiz Visibility & Access Control System

## Overview

A flexible, scalable visibility and permission system for quizzes. Creators can control who can discover, view, attempt, comment, and collaborate on their quizzes. Designed for future expansion without database redesigns.

---

## Architecture

```
src/
├── types/quiz.ts                          # Core TypeScript interfaces
├── mocks/
│   ├── quizVisibility.ts                  # Mock data + default configs
│   └── useQuizVisibility.ts               # Central state hook
└── components/quiz/
    ├── VisibilitySelector.tsx             # Visibility option cards
    ├── CollegeFilterPanel.tsx             # College/department/year/section filters
    ├── SchedulingPanel.tsx                # Start/end time selection
    ├── AccessRestrictionsPanel.tsx        # Additional access controls
    ├── PermissionToggle.tsx               # Discovery permission toggles
    └── CollaboratorManager.tsx            # Collaborator management
```

---

## Visibility Levels

| ID | Label | Description |
|----|-------|-------------|
| `global` | Global | Anyone on CodeJudge can discover/attempt |
| `college_only` | College Only | Selected colleges, departments, years, sections |
| `company_only` | Company Only | Selected companies, departments, teams, roles |
| `organization` | Organization / Club | Selected organizations/clubs |
| `classroom` | Classroom / Batch | Enrolled classroom members |
| `unlisted` | Unlisted | Only users with direct link |
| `private` | Private | Creator + invited collaborators only |
| `invite_only` | Invite Only | Only invited users by username/email |
| `contest_only` | Contest Only | Registered contest participants |

---

## Data Model

### `QuizVisibilityConfig`

```typescript
interface QuizVisibilityConfig {
  visibility: QuizVisibility;
  collegeFilter?: CollegeFilter;
  companyFilter?: CompanyFilter;
  organizationFilter?: OrganizationFilter;
  classroomFilter?: ClassroomFilter;
  inviteInfo?: InviteInfo;
  contestFilter?: ContestFilter;
  discoveryPermissions: DiscoveryPermissions;
  collaborators: Collaborator[];
  restrictions: AccessRestrictions;
  schedule: QuizSchedule;
}
```

### Key Types

- **`CollegeFilter`** — `collegeIds`, `departments`, `years`, `sections`, `graduationBatch`
- **`CompanyFilter`** — `companyIds`, `departments`, `teams`, `roles`, `experienceLevel`
- **`OrganizationFilter`** — `organizationIds`
- **`ClassroomFilter`** — `classroomId`, `batch`, `section`
- **`InviteInfo`** — `invitedUsers`, `inviteCode`
- **`ContestFilter`** — `contestId`
- **`DiscoveryPermissions`** — view, attempt, comment, discuss, share, rate, bookmark, clone, edit
- **`Collaborator`** — id, userId, username, avatar, role, addedAt
- **`AccessRestrictions`** — verifiedEmail, verifiedCollege, verifiedCompany, inviteCode, password, minXP, minRating, prerequisiteQuizId, requiredOrganizationId
- **`QuizSchedule`** — visibleFrom, visibleUntil, registrationDeadline, attemptWindow (start/end)

---

## State Management

### `useQuizVisibility(initialVisibility)`

Central hook managing all visibility state.

```typescript
const {
  visibility,
  setVisibility,
  config,
  collegeFilter,
  companyFilter,
  organizationFilter,
  classroomFilter,
  inviteInfo,
  contestFilter,
  discoveryPermissions,
  collaborators,
  restrictions,
  schedule,
  reset,
} = useQuizVisibility("global");
```

**Behavior**: When `setVisibility(newVisibility)` is called, the hook automatically resets visibility-specific filters to their default empty state via `getDefaultVisibilityConfig()`.

---

## Components

### `VisibilitySelector`

Grid of cards for selecting visibility level. Active card shows purple border + glow.

```typescript
<VisibilitySelector value={visibility} onChange={setVisibility} />
```

### `CollegeFilterPanel`

Multi-select chips for colleges, departments, years, sections.

```typescript
<CollegeFilterPanel filter={collegeFilter} onChange={setCollegeFilter} />
```

### `SchedulingPanel`

Datetime inputs for visibility window, registration deadline, and attempt window.

```typescript
<SchedulingPanel schedule={schedule} onChange={setSchedule} />
```

### `AccessRestrictionsPanel`

Checkboxes + conditional fields for email/college/company verification, invite code, password, min XP/rating.

```typescript
<AccessRestrictionsPanel restrictions={restrictions} onChange={setRestrictions} />
```

### `PermissionToggle`

Toggle switches for discovery permissions (view, attempt, comment, etc.).

```typescript
<PermissionToggle permissions={discoveryPermissions} onChange={setDiscoveryPermissions} />
```

### `CollaboratorManager`

Add/remove collaborators with role selection.

```typescript
<CollaboratorManager collaborators={collaborators} onChange={setCollaborators} />
```

---

## Mock Data

### Colleges
- IIT Delhi, IIT Bombay, NIT Trichy, DTU, VIT, BITS Pilani
- Departments: Computer Science, Electrical, Mechanical, Civil, IT, ECE

### Companies
- Google, Microsoft, Amazon, Adobe, Atlassian, Goldman Sachs
- Departments: Engineering, Product, Design, Sales, Research, Operations, Finance, Support

### Organizations
- ACM Student Chapter, IEEE, Programming Club, Coding Ninjas Campus Club, Internal Bootcamp

### Classrooms
- CSE 3rd Year (A/B), Batch 2027, CP Batch, DSA Weekend Batch

### Collaborators
- Pre-seeded with tourist (owner), benq (admin), petr (editor)

---

## Styling

- **Active visibility**: purple border `#7C3AED`, background tint `#7C3AED/10`, glow `0 0 20px rgba(124,58,237,0.15)`
- **Chips**: rounded-xl, border `white/[0.08]`, active state `border-[#7C3AED] bg-[#7C3AED]/15 text-[#7C3AED]`
- **Toggles**: `h-5 w-9` track, `h-3.5 w-3.5` thumb, active `bg-[#7C3AED]`
- **Panels**: dark cards `#111827`, border `white/[0.08]`, smooth fade-in animation

---

## Backend Integration Checklist

- [ ] Replace `useQuizVisibility` mock state with API calls
- [ ] Map backend response to `QuizVisibilityConfig`
- [ ] Add validation for datetime fields
- [ ] Implement searchable multi-select dropdowns for colleges/companies/organizations
- [ ] Add optimistic updates for collaborator changes
- [ ] Persist draft visibility config to localStorage
- [ ] Add permission middleware for quiz access
- [ ] Implement visibility-based query filtering in search/list endpoints
- [ ] Add audit logging for visibility changes

---

## Future Expansion

The schema supports adding new visibility types without changes:

```typescript
// Example: add "regional" visibility
case "regional":
  return { ...base, regionFilter: { country: [], state: [] } };
```

New restriction types can be added to `AccessRestrictions` without breaking existing data.