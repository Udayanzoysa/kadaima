# Kadaima LMS — Current State & Repository Audit (Phase 0)

**Audit Date:** 2026-10-31  
**Frontend Repository:** `d:\Personal\Projects\techwing-lms` (Next.js 16.2.9, React 19.2.7, TypeScript 5.9.3, Tailwind CSS 4)  
**Backend Repository:** `d:\Personal\Projects\lms-api` (NestJS 11.0.1, Prisma 5.22.0, PostgreSQL, CASL 7.0.0)

---

## 1. Verified Architecture & Stack

### 1.1 Backend (`lms-api`)
- **ORM & Database:** Prisma (`@prisma/client` ^5.22.0) with PostgreSQL (`lms-api/prisma/schema.prisma`, 16 applied migrations under `lms-api/prisma/migrations/`).
- **Authentication:** Passport JWT (`JwtAuthGuard`, `JwtStrategy` in `lms-api/src/auth/`) reading `Authorization: Bearer <token>`, plus Google OAuth (`google-auth-library`), TOTP 2FA (`otplib`), and Email/SMS password reset OTPs.
- **Authorization & RBAC:**
  - `Role` enum: `SUPER_ADMIN`, `CUSTOMER_ADMIN`, `USER`.
  - Account types are distinguished via `User.team` (`"Student"` vs `"Teacher"`), `User.customRoleId` (`CustomRole` + `PermissionSet` + `Permission`), and `TeacherProfile` relation.
  - CASL `AbilityFactory` (`lms-api/src/auth/casl/ability.factory.ts`) and `PoliciesGuard` (`lms-api/src/auth/guards/policies.guard.ts`) evaluate `(Action, Subject)` pairs.
  - Current `Subject` enum values in `schema.prisma`: `SETTINGS`, `USERS`, `ROLES`, `DASHBOARD_ACCESS`, `LOG`, `REPORTS`, `QUIZZES`, `LEADS`.
  - Teachers receive the `"Teacher"` `CustomRole`, which connects the `"Quizzes"` (`MANAGE QUIZZES`) and `"Dashboard Access"` (`MANAGE DASHBOARD_ACCESS`) permission sets.
- **Audit Logging:** `AuditModule` (`lms-api/src/audit/`) with `@Audit(subject, action)` interceptor/decorator writing to `AuditLog` (`audit_logs` table). `AuditLog.subject` is a free-text `VarChar(64)` column (not constrained by the `Subject` enum).
- **File Uploads:** Local disk storage via `multer` under `uploads/quizzes`, `uploads/questions`, `uploads/slips`, `uploads/teachers`, served statically at `/uploads/*` in `lms-api/src/main.ts`. (Note: private classroom lesson assets in Phase 3 will require non-public storage outside `/uploads/*` or gated streaming endpoints).
- **Payments & Gateways:** PayHere integration (`lms-api/src/payments/payhere.util.ts`, `payments.service.ts`) supporting MD5 webhook verification (`POST /payments/payhere/notify`), sandbox completion helper, `UnlockVoucher`, and `PaymentSlipSubmission` (for `QuizUnlock` and `StudentSubscription`).
- **Notifications:** `EventEmitter2` (`@nestjs/event-emitter`) + `NotificationListener` (`lms-api/src/notification/`) dispatching Nodemailer SMTP emails and Hutch / Notify.lk SMS via database-stored config in `SystemSetting`.

### 1.2 Frontend (`techwing-lms`)
- **Routing & Rewrites (`next.config.mjs` & `src/middleware.ts`):**
  - `/admin/:path*` and `/teacher/:path*` rewrite to `/dashboard/:path*` (`src/app/(main)/dashboard/...`).
  - `src/middleware.ts` decodes the JWT `session_token` cookie: users with `payload.team === "Student"` are redirected away from `/admin` and `/teacher` to `/`.
  - `PermissionGuard` (`src/app/(main)/dashboard/_components/sidebar/permission-guard.tsx`) fetches `GET /dashboard/menu` and `GET /dashboard/permissions` and enforces route-level access in the dashboard.
- **Localization (`src/lib/i18n.ts`, `src/hooks/use-i18n.tsx`):**
  - UI dictionaries in `src/locales/en.json`, `src/locales/si.json`, and `src/locales/ta.json`.
  - Database localized fields use JSON `{ en: string, si: string, ta: string }` validated by `LocalizedTextDto`.

---

## 2. Capability Audit Matrix

| Capability / Domain | Status | Evidence (Files / Models) | Notes & Gaps for Classroom LMS |
|---|---|---|---|
| **Multi-language UI & Content (`en`, `si`, `ta`)** | **Verified** | `techwing-lms/src/locales/{en,si,ta}.json`, `lms-api/src/common/types/localized-text.ts`, `ContentLanguage` enum | Ready to extend with new translation keys for classes, timetable, enrollment, lessons, attendance, and tuition billing. |
| **Course & Module Hierarchy** | **Verified (Platform-Scoped)** | `Course`, `Module` models (`schema.prisma`); `lms-api/src/course/course.controller.ts`; `techwing-lms/src/app/(main)/dashboard/courses/` | **Important finding:** `Course` and `Module` have **no** `createdById` or `workspaceId` column. Any user with `QUIZZES` permission can create/edit courses and modules globally. |
| **Quizzes, Question Bank, Timer, Anti-Cheat, AI Review** | **Verified** | `Quiz`, `QuizSection`, `Question`, `QuizAttempt`, `StudentResponse`; `lms-api/src/quiz/`; `techwing-lms/src/app/quiz/` | `Quiz` has `createdById` (`User`), `courseId`, `moduleId`. Must be preserved untouched and linked to batches/lessons in Phase 3. |
| **Teacher Storefront & Marketing Class Cards** | **Verified (Marketing Only)** | `TeacherProfile`, `TeacherClass` (`teacher_classes` table); `lms-api/src/teachers/`; `techwing-lms/src/app/t/[slug]/` | **Crucial distinction:** `TeacherClass` (`teacher_classes`) is a simple marketing card on `/t/[slug]` (`title`, `scheduleTime`, `location`, `feeLabel`, `whatsappGroupUrl`). It is **not** an operational LMS cohort/batch and must remain intact for the public teacher page. |
| **Quiz Unlocks, Global Subscriptions & 60/40 Teacher Pool** | **Verified** | `PaymentOrder`, `QuizUnlock`, `StudentSubscription`, `RevenuePeriod`, `TeacherRevenueShare`, `TeacherPayout` | Scoped strictly to quiz unlocks and global quiz subscriptions. Must not be conflated with monthly class tuition billing. |
| **Operational Class / Batch CRUD & Schedules (Phase 1)** | **Missing** | N/A (`sidebar-items.ts` has a disabled `/admin/students` item with `badge: "soon"`) | Requires new `ClassBatch`, `ClassTeacher`, and `ClassSchedule` models, NestJS module, and teacher/student UI. |
| **Student Class Enrollment, Invitations & Roster (Phase 2)** | **Missing** | N/A | Requires `ClassEnrollment` and `ClassInvitation` models, join/invite flows, capacity enforcement, and teacher roster view. |
| **Lessons, Protected Resources & Class Quiz Assignments (Phase 3)** | **Missing** | N/A (`uploads/*` is currently public static middleware) | Requires `Lesson`, `LessonResource`, `LessonProgress`, `ClassQuizAssignment` models, and authenticated short-lived/streamed asset delivery (not public `/uploads`). |
| **Class Sessions & Attendance Tracking (Phase 4)** | **Missing** | N/A | Requires `ClassSession`, `AttendanceRecord`, and audit logging. |
| **Tuition Fee Plans, Monthly Invoices & Ledger (Phase 5)** | **Missing** | N/A (`src/app/(main)/dashboard/invoice` is a static template demo page) | Requires `FeePlan`, `Invoice`, `InvoiceAdjustment`, `PaymentAllocation`, `Receipt` using integer minor units (`amount_minor`). |
| **Tuition Checkout, Manual Verification & Receipts (Phase 6)** | **Partially Implemented (Quiz-only)** | `lms-api/src/payments/` has PayHere & slip infrastructure, but hardcoded to `quizId` / `SUBSCRIPTION` | Tuition payments require separate invoice allocation, idempotency (`payment_events`), teacher/admin scope, and printable receipts. |

---

## 3. Ownership & Tenancy Analysis

1. **Workspace Model (`Workspace`):**
   - All students and teachers registering via `/student/register` (`POST /auth/register/student`) and `/teacher/register` (`POST /auth/register/teacher`) are placed into the single default workspace (`"Techwing LMS"`).
   - `TenantPrismaClient` (`lms-api/src/prisma/tenant-prisma.client.ts`) exists in the repo but is **not** injected by any service; all services inject `PrismaService` directly.
2. **Teacher Ownership:**
   - Teachers are isolated at the **user level** (`createdById = req.user.id` on `Quiz` and `Question`, `userId = req.user.id` on `TeacherProfile`, `teacherUserId` on `QuizAttempt` / `TeacherRevenueShare`).
   - However, notice that in `QuizController` and `CourseController`, several endpoints only check `@UseGuards(JwtAuthGuard)` without filtering mutations by `createdById` unless the service explicitly enforces it.
   - **Requirement for Classroom LMS:** Every `ClassBatch` MUST have an explicit `primaryTeacherId` (`User.id`), optional `workspaceId` (`Workspace.id`), and optional co-teachers (`ClassTeacher`), and **every** service method in the new `ClassesModule` must enforce teacher ownership (`primaryTeacherId === user.id`, assigned in `ClassTeacher`, or `user.role === Role.SUPER_ADMIN`).

---

## 4. Current Role & Permission Mapping

| Actor | `User.role` | `User.team` | `User.customRole.name` | Current CASL Permissions | Proposed LMS Capabilities |
|---|---|---|---|---|---|
| **Super Admin** | `SUPER_ADMIN` | `"Admin"` / any | `"Owner"` / `null` | `manage` on `all` | Full platform oversight, cross-teacher class management, audit/reconciliation |
| **Teacher** | `USER` | `"Teacher"` | `"Teacher"` | `MANAGE` on `QUIZZES`, `DASHBOARD_ACCESS` | Create/manage own `ClassBatch`es, schedules, enrollments, lessons, attendance, and class fee ledgers |
| **Student** | `USER` | `"Student"` | `null` | None (`[]`) | View enrolled classes (`/classes` or student portal), view personal timetable (`GET /students/me/timetable`), lessons, attendance, and tuition invoices |

