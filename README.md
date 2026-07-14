# Kadaima

Public quiz platform and admin LMS frontend for **Kadaima** (Grade 5 scholarship prep and multi-language quizzes).

Built with **Next.js**, TypeScript, Tailwind CSS, and Shadcn UI.

## What’s included

- **Public home (`/`)** — Kadaima quiz catalog, hero carousel with quiz preview images, upcoming challenges
- **Guest quiz flow** — quiz detail, take quiz, results (`/quiz/...`, `/results/...`)
- **Admin (`/admin`)** — quiz & question bank management, users, roles, settings
- **Teacher (`/teacher`)** — same dashboard entry for teachers
- **i18n** — English, Sinhala, Tamil

## Routes

| Path | Description |
|------|-------------|
| `/` | Public quiz home |
| `/quiz/[id]` | Public quiz detail / take |
| `/admin/...` | Admin dashboard |
| `/teacher/...` | Teacher dashboard |
| `/auth/v1/login` | Login |

## Setup

```bash
npm install
cp .env.local.example .env.local   # if present; otherwise create .env.local
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Environment

Create `.env.local` with at least:

```env
NEXT_PUBLIC_API_URL=http://localhost:5425
```

The NestJS API lives in a separate backend repo (`lms-api`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Lint with Biome |

## Stack

- Next.js 16 + React Compiler
- TypeScript
- Tailwind CSS + Shadcn UI
- TipTap (quiz description editor)

## License

Private — Udayanzoysa / Kadaima.
