# Kadaima LMS — Phase 9 (P1 Expansion) Implementation Master Plan

**Status:** APPROVED & ACTIVE  
**Prerequisites:** Kadaima Classroom LMS MVP (Phases 0–8) Fully Verified  
**Architecture:** Next.js 16.2.9 Frontend (`techwing-lms`), NestJS 11 Backend (`lms-api`), PostgreSQL + Prisma ORM  

---

## 1. P1 Architecture Audit & Capability Mapping

```
                                      ┌─────────────────────────────────────────────────────────┐
                                      │              KADAIMA CLASSROOM LMS (MVP)                │
                                      │   Batches · Schedules · Roster · Lessons · Quizzes      │
                                      │   Attendance · Tuition Invoices · PayHere · Dashboards  │
                                      └────────────────────────────┬────────────────────────────┘
                                                                   │
                                  ┌────────────────────────────────┴────────────────────────────────┐
                                  ▼                                                                 ▼
     ┌─────────────────────────────────────────────────────────┐       ┌─────────────────────────────────────────────────────────┐
     │           P1.1: ASSIGNMENTS & GRADEBOOK                 │       │              P1.2: GUARDIAN / PARENT PORTAL             │
     │  - Teacher-issued homework & file attachments           │       │  - Verified parent-student linking & OTP consent        │
     │  - Student file submissions & late policies             │       │  - Read-only attendance, grades & tuition view          │
     │  - Rubric criteria, scoring, feedback & resubmissions  │       │  - Minor safety controls & notification consent         │
     │  - Unified Class Gradebook (Quizzes + Assignments)      │       └─────────────────────────────────────────────────────────┘
     └─────────────────────────────────────────────────────────┘
                                  ▲                                                                 ▲
                                  │                                                                 │
     ┌────────────────────────────┴────────────────────────────┐       ┌────────────────────────────┴────────────────────────────┐
     │         P1.3: LOCALIZED NOTIFICATIONS                   │       │               P1.4: LIVE CLASSES & RECORDINGS           │
     │  - Schedule reminders, invoice overdue & absence alerts │       │  - Google Meet / Zoom / Jitsi / Teams integration       │
     │  - Email (Nodemailer) & SMS (Sri Lanka gateways)        │       │  - Automated launch drawer & join presence corroboration│
     │  - Tri-lingual templates (EN / SI / TA) + opt-out logs  │       │  - Tuition-gated recording streaming & expiry access    │
     └─────────────────────────────────────────────────────────┘       └─────────────────────────────────────────────────────────┘
```

### 1.1 Existing System Audit for P1 Foundations
1. **Private Storage & Streaming:**
   - `LessonsService` has established a battle-tested HMAC-SHA256 user-bound streaming pattern with MIME inspection, sanitization, and 25MB limits. This directly powers student homework file uploads and private assignment attachments.
2. **Role-Based Access Control:**
   - Existing roles (`Role.USER`, `Role.SUPER_ADMIN`, `team: 'Teacher' | 'Student'`) and class tenant guards (`ClassesService.requireWriteAccess`, `requireTeacherReadAccess`) provide authorization isolation across teachers and enrolled students.
3. **Notification Infrastructure:**
   - `lms-api` contains an active `NotificationModule` with `mail.service.ts` (SMTP / Nodemailer), `sms.service.ts`, and EventEmitter event hooks (`@OnEvent`).
4. **Schedule & Timezone Handling:**
   - `Asia/Colombo` date utilities (`getZonedDateInfo`, `localDateTimeToUtc`) prevent timezone shifts across assignments and live session start times.

---

## 2. P1 Capability Breakdown & Specification

### P1.1: Assignments, Submissions & Rubric Grading (First Execution Target)
- **Problem Statement:** Teachers need to assign open-ended coursework, research papers, and problem sets with deadlines; students need to submit documents/PDFs; teachers need rubrics, scores, and resubmission workflows.
- **Data Models:**
  - `ClassAssignment`: Linked to `ClassBatch` (and optional `Lesson`), title (localized), description, max points, due date, cutoff date (late submission window), late penalty percentage, allowed file types, max file size.
  - `AssignmentAttachment`: Teacher reference materials / worksheets.
  - `AssignmentRubricCriterion`: Rubric items (title, description, max points).
  - `AssignmentSubmission`: Linked to `ClassAssignment` and `studentId`, status (`SUBMITTED`, `LATE`, `GRADED`, `RESUBMISSION_REQUESTED`), submittedAt, studentNotes, finalScore, teacherFeedback, gradedAt, gradedById.
  - `SubmissionAttachment`: Private student upload files (`storageKey`, `fileName`, `mimeType`, `sizeBytes`, `checksumSha256`).
  - `SubmissionCriterionGrade`: Points earned per rubric item with criterion feedback.
- **Security & Authorization:**
  - IDOR Prevention: Students can only view, edit, or submit to their own submissions.
  - Hard Deadline Enforcement: Submissions past `cutoffAt` are strictly rejected by the backend. Submissions between `dueAt` and `cutoffAt` are automatically stamped as `LATE`.
  - File Validation: Antivirus/script heuristic check on PDF, DOCX, ZIP, and images.

---

### P1.2: Guardian / Parent Portal & Minor Consent
- **Problem Statement:** Parents in Sri Lanka need transparent visibility into student attendance, homework completion, exam performance, and monthly tuition status without impersonating student accounts.
- **Data Models:**
  - `StudentGuardian`: Guardian user account with verified mobile number and national identity (NIC).
  - `StudentGuardianRelation`: Linking student to guardian with relation type (`FATHER`, `MOTHER`, `LEGAL_GUARDIAN`), verification status (`PENDING`, `VERIFIED`, `REVOKED`), and verifiedAt.
  - `GuardianConsentLog`: Audited consent for minor data processing and communications.
- **Security & Authorization:**
  - Parent accounts have read-only access to scoped endpoints: child's attendance %, fee ledger, and quiz/assignment report cards.
  - Parents cannot take quizzes, submit assignments, or alter batch enrollments.

---

### P1.3: Localized Multi-Channel Notifications (SMS, Email & In-App)
- **Problem Statement:** Students and parents forget class schedules or miss payment deadlines unless notified via SMS and email in their preferred language.
- **Trigger Scenarios:**
  - `SCHEDULE_REMINDER`: 2 hours prior to class session occurrence.
  - `ATTENDANCE_ABSENCE`: Alert to parent/student when marked `ABSENT` in a session.
  - `INVOICE_ISSUED_DUE`: Notification when monthly invoice is generated, 3 days before due date, and when overdue.
  - `ASSIGNMENT_PUBLISHED`: Notification when a new assignment is posted.
  - `PAYMENT_CONFIRMED`: Official receipt number delivered to student and guardian.
- **Channels:** SMS (Sri Lanka GSM providers / Dialog / Mobitel / Twilio), Email (HTML formatted in Sinhala, Tamil, English), and In-App notification badge.

---

### P1.4: Live Classes & Video Conference Corroboration
- **Problem Statement:** Virtual classes require seamless meeting links (Zoom, Google Meet, Teams, Jitsi) with attendance sync and gated recording archives.
- **Capabilities:**
  - Schedule slot and session live link with security password.
  - Student launch redirect with attendance corroboration (marks student present or late based on join time).
  - Cloud recording link with tuition payment gating (students with unpaid overdue invoices are restricted from recording access).

---

## 3. Sequential Implementation Roadmap

| Sub-Phase | Capability | Key Artifacts | Dependencies | Status |
|---|---|---|---|---|
| **P1.1** | **Assignments, Submissions & Rubrics** | Prisma migration, NestJS `AssignmentsModule`, API endpoints, Student & Teacher UI | Phase 3 (Lessons), Storage | **IN PROGRESS (Next Step)** |
| **P1.2** | **Guardian / Parent Portal** | Prisma migration, Guardian Auth, Student Linking, Parent Dashboard | P1.1 (Grades), Phase 4 (Attendance), Phase 5 (Fees) | Queued |
| **P1.3** | **Multi-Channel Notifications** | Event dispatchers, localized SMS/Email templates, delivery retry queue | Phase 4, Phase 5, P1.1 | Queued |
| **P1.4** | **Live Classes & Recordings** | Meeting launch corroboration, recording access gating | Phase 1 (Schedules), Phase 4 (Attendance) | Queued |

---

## 4. Execution Protocol: One Capability at a Time
In accordance with user direction, each P1 capability is executed strictly in isolated sequence:
1. **Schema Migration & Constraints** (PostgreSQL / Prisma).
2. **Backend Service, DTOs & IDOR Authorization Tests** (`lms-api`).
3. **Frontend API Client, i18n Dictionaries (EN/SI/TA) & Responsive UI** (`techwing-lms`).
4. **Verification & Acceptance** (automated test execution, zero regressions on MVP core).

