# Kadaima LMS — Architecture Decisions & Provisional Defaults (Phase 0)

**Date:** 2026-10-31  
**Status:** Phase 0 Baseline (Provisional defaults marked clearly where owner sign-off is pending)

---

## 1. Engineering Decisions (Verified from Codebase)

### ADR-01: Do Not Collide with `TeacherClass` (`teacher_classes`)
- **Context:** `lms-api/prisma/schema.prisma` already defines `model TeacherClass` mapped to `@@map("teacher_classes")`, which powers the public marketing accordion on `/t/[slug]`.
- **Decision:** Keep `TeacherClass` (`teacher_classes`) untouched for public storefront promotion. Name the operational LMS cohort model `ClassBatch` mapped to `@@map("class_batches")`, with related models `ClassTeacher` (`@@map("class_teachers")`) and `ClassSchedule` (`@@map("class_schedules")`).

### ADR-02: Course Ownership vs. Batch Ownership
- **Context:** `Course` and `Module` are currently platform-wide shared catalog entities (`courses`, `modules`) with localized JSON titles (`{ en, si, ta }`).
- **Decision:** Keep `Course` and `Module` as reusable academic containers. A `ClassBatch` references an existing `courseId` (`Course.id`) and is strictly owned by `primaryTeacherId` (`User.id`) and scoped to `workspaceId` (`Workspace.id`). Teachers can only view/edit/archive batches where they are `primaryTeacherId` or listed in `ClassTeacher` (unless `SUPER_ADMIN`).

### ADR-03: Student Portal Routing vs. Teacher/Admin Dashboard Routing
- **Context:** `techwing-lms/src/middleware.ts` redirects any logged-in user with `payload.team === "Student"` away from `/admin/*` and `/teacher/*` to `/`. Meanwhile, logged-in students already use top-level external/account routes (`/profile`, `/payments`, `/quiz/in-progress`, `/quiz/my-attempts`).
- **Decision:**
  - **Teacher & Admin Class Management UI** lives inside the dashboard under `/admin/classes` (also reachable via `/teacher/classes` rewrite) mapped to `src/app/(main)/dashboard/classes/...`.
  - **Student Class & Timetable UI** lives under `/classes` (`src/app/(external)/classes/page.tsx` and `src/app/(external)/classes/[classId]/page.tsx`) and `/timetable` (`src/app/(external)/timetable/page.tsx`), protected for logged-in students in `src/middleware.ts` (just like `/profile` and `/payments`) and linked in the public header navigation when signed in.

### ADR-04: CASL RBAC & Permission Subject Extension
- **Context:** Teachers currently have `Action.MANAGE` on `Subject.QUIZZES` and `Subject.DASHBOARD_ACCESS`.
- **Decision:**
  - Add `CLASSES` to the Prisma `Subject` enum (backward-compatible additive enum value in PostgreSQL).
  - Grant access to `/admin/classes` in `PermissionGuard` and `AppSidebar` when a user has `MANAGE`/`READ` on `CLASSES` **or** `QUIZZES` (so existing registered teachers work immediately without manual role migration), while also seeding/updating the `"Teacher"` `CustomRole` to include `CLASSES` permissions.
  - Enforce object-level ownership (`primaryTeacherId` / `ClassTeacher` membership) inside `ClassesService` for every read/write operation.

### ADR-05: Timezone & Schedule Representation
- **Context:** Classes operate primarily in Sri Lanka (`Asia/Colombo`, UTC+05:30) with recurring weekly slots.
- **Decision:**
  - `ClassSchedule` stores `weekday` (`0` = Sunday .. `6` = Saturday), `localStartTime` (`"HH:mm"` 24-hour string, e.g. `"09:00"`), `localEndTime` (`"HH:mm"`, e.g. `"11:00"`), `timezone` (default `"Asia/Colombo"`), `locationType` (`ONLINE` | `PHYSICAL` | `HYBRID`), `locationValue`, `effectiveFrom`, and `effectiveTo`.
  - When computing concrete upcoming occurrences for `GET /students/me/timetable?from=&to=` (and later `ClassSession` in Phase 4), instants are computed in the schedule's IANA timezone (`Asia/Colombo`) and returned with both UTC ISO timestamps (`startsAtUtc`, `endsAtUtc`) and local display metadata.

---

## 2. Business Decisions & Provisional Defaults (Flagged for Owner Review)

In accordance with Rule 12 of the Master Prompt, the following business decisions are separated from engineering blockers and configured with safe provisional defaults:

| # | Business Decision | Provisional Default (Configurable) | Impact / Where Used |
|---|---|---|---|
| **BD-01** | **Tenant / Organization Isolation:** Single shared platform workspace with independent teachers vs. multi-institute workspaces. | **Independent Teachers within Workspace:** `ClassBatch` stores both `workspaceId` (populated from `user.workspaceId`) and `primaryTeacherId` (`user.id`). Default query scope isolates Teacher A from Teacher B even within the default `"Techwing LMS"` workspace. | Phase 1 (`ClassBatch` queries & guards) |
| **BD-02** | **Tuition Settlement & Commission Policy:** Who collects tuition and whether Kadaima takes a commission on class fees. | **No Automatic Split (100% Class Ledger):** Tuition invoices and payments are tracked in a dedicated class ledger (`fee_plans`, `invoices`, `payment_allocations`) completely separate from the 60/40 `RevenuePeriod` quiz pool. | Phase 5 & Phase 6 |
| **BD-03** | **Payment Gateway for Tuition:** PayHere one-off checkout vs. recurring vs. manual bank slip/cash. | **PayHere One-Off Per Monthly Invoice + Manual Slip/Cash Verification:** Reuses PayHere merchant credentials in a separate invoice checkout flow; no payment is marked `Paid` without verified webhook signature or authorized manual approval. | Phase 6 |
| **BD-04** | **Overdue Content Gating Policy:** Should overdue tuition block access to class lessons/quizzes? | **`inform_only` (Default):** Enum `FeeAccessPolicy { INFORM_ONLY, GRACE_PERIOD, BLOCK_AFTER_GRACE }` defaults to `INFORM_ONLY` until owner switches it per fee plan. | Phase 3 & Phase 5 |
| **BD-05** | **Manual Bank/Cash Approval Authority:** Can the class teacher approve bank slips/cash for their own batch, or only Super Admin? | **Class Primary Teacher OR Super Admin (with immutable audit log):** Configurable via permission check; every approval records `actorId`, timestamp, and bank reference uniqueness check. | Phase 6 |
| **BD-06** | **Minor / Under-18 Guardian Info:** Are guardian name/phone fields mandatory during class enrollment? | **Optional fields on Enrollment/Profile:** Support optional `guardianName` and `guardianPhone` without blocking existing student accounts from enrolling. | Phase 2 |
| **BD-07** | **Multiple Batches per Course:** Can a student enroll in more than one batch linked to the same `Course` (e.g., Theory batch + Revision batch)? | **Allowed across different batches; blocked within the same batch:** Unique constraint on `(classId, studentId)` prevents duplicate enrollment in the same batch while allowing enrollment in distinct batches of the same course. | Phase 2 |
| **BD-08** | **Default Schedule Timezone:** Default timezone for class schedules and monthly billing cutoffs. | **`Asia/Colombo` (IANA timezone)** stored explicitly on every `ClassSchedule` row. | Phase 1, Phase 4, Phase 5 |

