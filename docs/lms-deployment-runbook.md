# Kadaima LMS — Production Deployment, Security & Operations Runbook

**Date:** 2026-10-31  
**System Version:** Kadaima Classroom LMS v1.0.0 (Phases 0–8 Completed & Verified)  
**Target Environments:** Staging / Production  
**Backend:** NestJS 11 (`lms-api`) on Node 20+, PostgreSQL 15+ (Prisma 5.22.0)  
**Frontend:** Next.js 16.2.9 (`techwing-lms`), React 19.2.7, Tailwind CSS, Biome, Turbopack  

---

## 1. Executive Summary & Verification Matrix

| Validation Layer | Target Tool / Command | Verification Result | Status |
|---|---|---|---|
| **Classroom LMS Unit & Integration Tests** | `npx jest src/classes/classes.service.spec.ts --runInBand` | **37 / 37 passed** (0 failures, 1.238s) | **PASS** |
| **All Backend Test Suites (`lms-api`)** | `npm test` | **38 / 38 passed** (`app.controller.spec.ts` + `classes.service.spec.ts`) | **PASS** |
| **Backend Production Compilation (`lms-api`)** | `npm run build` (`nest build`) | **Exit code 0** (clean compilation to `dist/`) | **PASS** |
| **Frontend TypeScript Verification (`techwing-lms`)** | `npx tsc --noEmit` | **Exit code 0** (zero type diagnostics) | **PASS** |
| **Frontend Production Build (`techwing-lms`)** | `npm run build` (`next build`) | **Exit code 0** (75/75 routes generated, static & dynamic) | **PASS** |
| **Public Quiz & Subscription Regression** | `/quiz`, `/quiz/[id]`, `/results/[token]`, `/payments` | **Zero regression**; 60/40 revenue and quiz logic strictly isolated | **PASS** |

---

## 2. RBAC & IDOR Security Audit Matrix

| Resource & Action | Enforced Rule & Guard | IDOR & Unauthorized Behavior | Test Proof |
|---|---|---|---|
| **Class Batch Creation** (`POST /classes`) | `JwtAuthGuard` + `team !== 'Student'` & valid Teacher/Admin role | `STUDENT` denied with `403 Forbidden` | `src/classes/classes.service.spec.ts:347` |
| **Class Batch Mutate / Archive / Duplicate** (`PATCH/POST /classes/:id/*`) | Primary teacher ownership or `INSTRUCTOR` scope in `ClassTeacher`, or `SUPER_ADMIN` | Teacher B denied mutating Teacher A batch with `403 Forbidden` | `src/classes/classes.service.spec.ts:360` |
| **Student Roster & Enrollments** (`GET /classes/:id/enrollments`) | Teacher assigned to batch or `SUPER_ADMIN` | Teacher B denied reading Teacher A roster with `403 Forbidden` | `src/classes/classes.service.spec.ts:615` |
| **Private Lesson Resources** (`POST /lessons/:id/resources/:rid/access-url`) | Active enrollment in published batch, or teacher/admin; verified scan status | Unenrolled student denied (`403`); quarantined file denied (`403`) | `src/classes/classes.service.spec.ts:719, 2588` |
| **Private File Streaming** (`GET /lessons/resources/:rid/stream?token=...`) | Short-lived (300s) user-bound HMAC-SHA256 signature; re-verifies live enrollment | Copied URL used by User B denied (`403`); expired token denied (`403`) | `src/classes/classes.service.spec.ts:719, 2588` |
| **Session Attendance Marking** (`PUT /sessions/:sid/attendance`) | Teacher write access; checks session lock and cancellation | Teacher B denied (`403`); locked session denied (`403`); cancelled session rejected (`400`) | `src/classes/classes.service.spec.ts:881, 2465` |
| **Monthly Invoice Generation** (`POST /classes/:id/invoices/generate`) | Teacher write access; idempotent `(enrollmentId, periodYyyyMm)` | Duplicate invoice prevented; price snapshot preserved on fee changes | `src/classes/classes.service.spec.ts:1338` |
| **Invoice Detail Access** (`GET /invoices/:id`) | `inv.studentId === actor.id` or Teacher read access on `inv.classId` | Foreign student denied with `403 Forbidden` | `src/classes/classes.service.spec.ts:2415` |
| **Payment Confirmation** (`POST /invoices/:id/payments`) | Server-side funds confirmation restricted to Teacher/Admin write access | Student denied self-confirming `SUCCEEDED` (`403`); `PENDING` never marks invoice paid | `src/classes/classes.service.spec.ts:1466` |
| **Gateway Webhooks** (`POST /payments/webhooks/payhere`) | MD5 secret signature verification + merchant ID, currency & minor amount check | Forged signature rejected (`400`); replay deduplicated idempotently without double-credit | `src/classes/classes.service.spec.ts:1647, 1778` |
| **Payment Status Inspection** (`GET /payments/:id/status`) | `payment.payerId === actor.id` or Teacher read access on class | Foreign student denied with `403 Forbidden` | `src/classes/classes.service.spec.ts:2415` |
| **Tuition Refunds & Reversals** (`POST /payments/:id/refund`) | Teacher write access on payment class batch | Teacher B denied (`403`); reverses invoice balance, voids receipt on full refund | `src/classes/classes.service.spec.ts:2440, 2500` |
| **Manual Payment Submissions** (`POST /manual-payments/:id/approve|reject`) | Teacher write access on submission class batch | Cross-teacher review denied (`403`); duplicate bank slip references blocked (`400`) | `src/classes/classes.service.spec.ts:1885` |

---

## 3. Database Migrations Deployment Plan

All 6 production migrations use PostgreSQL safe DDL with foreign key constraints, indexes, and unique constraints:

```bash
# Verify pending migrations against target database
npx prisma migrate status

# Apply migrations sequentially in production
npx prisma migrate deploy
```

### Applied Migrations Inventory:
1. `20261031010000_phase1_class_batches_schedules`:
   - Tables: `class_batches`, `class_teachers`, `class_schedules`
   - Constraints: Foreign keys to `courses`, `users`, `workspaces`; unique indexes on `(classId, weekday, localStartTime)`.
2. `20261031020000_phase2_invitations_and_roster`:
   - Tables: `class_invitations`, `class_enrollments`
   - Constraints: Unique constraint on `(classId, studentId)`; unique index on `(classId, tokenHash)`.
3. `20261031030000_phase3_lessons_resources_and_quiz_assignments`:
   - Tables: `lessons`, `lesson_resources`, `lesson_progress`, `class_quiz_assignments`
   - Constraints: Unique `(classId, studentId, lessonId)`; unique `(classId, quizId)`.
4. `20261031040000_phase4_sessions_and_attendance`:
   - Tables: `class_sessions`, `attendance_records`, `attendance_correction_changes`
   - Constraints: Unique `(classId, startsAtUtc)`; unique `(classSessionId, studentId)`.
5. `20261031050000_phase5_tuition_billing_and_invoices`:
   - Tables: `class_fee_plans`, `tuition_invoices`, `tuition_invoice_adjustments`, `tuition_billing_audit_events`
   - Constraints: Unique `(enrollmentId, periodYyyyMm)`; versioned `class_fee_plans`.
6. `20261031060000_phase6_gateway_webhooks_manual_slips_and_receipts`:
   - Tables: `tuition_payments`, `tuition_payment_allocations`, `tuition_payment_events`, `tuition_manual_payment_submissions`, `tuition_receipts`
   - Constraints: Unique `providerOrderId`; unique `(provider, externalEventId)`; unique `paymentId` on `tuition_receipts`.

---

## 4. Production Environment Configuration

Add or verify the following environment variables across production services:

### Backend (`lms-api` `.env`):
```ini
# Application URLs
BACKEND_URL="https://api.kadaima.lk"
FRONTEND_URL="https://kadaima.lk"

# Database
DATABASE_URL="postgresql://<user>:<password>@<db-host>:5432/techwing_lms?schema=public&sslmode=prefer"

# Resource Security & User-Bound Token Signatures
JWT_SECRET="<secure-64-character-random-hex>"
RESOURCE_SIGNING_SECRET="<secure-64-character-random-hex>"

# PayHere Online Payment Gateway
PAYHERE_MODE="live" # "live" for production, "sandbox" for staging/QA
PAYHERE_MERCHANT_ID="<your-live-payhere-merchant-id>"
PAYHERE_MERCHANT_SECRET="<your-live-payhere-merchant-secret>"
PAYHERE_TUITION_NOTIFY_URL="https://api.kadaima.lk/api/v1/payments/webhooks/payhere"

# Rate Limiting & Throttling
THROTTLE_TTL=60000
THROTTLE_LIMIT=120
```

### Frontend (`techwing-lms` `.env.production`):
```ini
NEXT_PUBLIC_API_URL="https://api.kadaima.lk/api/v1"
NEXT_PUBLIC_APP_URL="https://kadaima.lk"
```

---

## 5. Operational Monitoring, Alerting & Metrics

Set up alerts in your monitoring stack (Prometheus / Grafana / Datadog / CloudWatch) on these critical metrics:

1. **Gateway Webhook Failure Spike Alert:**
   - Metric: `count(class_gateway_webhook_events{status="FAILED"}) > 0`
   - Query: `SELECT count(*) FROM tuition_payment_events WHERE status = 'FAILED' AND created_at > NOW() - INTERVAL '15 minutes';`
   - Action: Inspect merchant secret or signature format; review failed payload in Admin Governance panel (`/admin/default`).
2. **Duplicate Invoice Anomaly Alert:**
   - Metric: Rate of duplicate key rejections on `(enrollmentId, periodYyyyMm)` exceeding baseline.
   - Idempotency guarantees safe rejection, but alert indicates misconfigured concurrent cron jobs.
3. **Private Asset Authorization Denials:**
   - Metric: Spike in `403 Forbidden` responses on `/lessons/resources/:id/stream` or `/access-url`.
   - Alert threshold: > 20 denials in 5 minutes (indicates link-sharing attempts or bot crawling).
4. **Attendance Lock / Tampering Spikes:**
   - Metric: `403` attempts on `PUT /sessions/:sessionId/attendance` where `isLocked = true`.

---

## 6. Rollback & Disaster Recovery Strategy

In the unlikely event of an operational blocker:

1. **Feature Flag / Navigation Decoupling:**
   - The Classroom LMS navigation items (`/classes`, `/timetable`, `/admin/classes`) are modularly isolated from public quiz taking and subscription purchasing.
   - If payment webhook provider encounters external upstream downtime, toggle `PAYHERE_MODE=sandbox` or instruct students to use the **Bank Transfer / Cash Slip Upload** channel (`/classes?tab=tuition`).
2. **Database Rollback:**
   - Point-in-Time Recovery (PITR) enabled on PostgreSQL instance with 30-day retention.
   - Migration rollback script: Each migration schema changes add new tables prefixed with `class_`, `lesson_`, or `tuition_` and never drop existing legacy course/quiz columns.
3. **Receipt & Financial Immutability:**
   - Even during network partitioning, settled tuition payments and printed receipts (`RCP-...`) are persisted as permanent JSON snapshots in `tuition_receipts` and cannot be mutated or deleted.

