# API Reference

All product APIs use `/api/v1`. Auth.js framework endpoints remain `/api/auth/*`.

## Public

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- Auth.js sign-in/session endpoints under `/api/auth/*`

## Student

- `GET/PATCH /api/v1/profile`
- `GET /api/v1/questions?subject=&grade=&difficulty=&cursor=&limit=`
- `POST /api/v1/exams/start`
- `GET /api/v1/exams/:attemptId`
- `PATCH /api/v1/exams/:attemptId/answers/:questionId`
- `POST /api/v1/exams/:attemptId/submit`
- `GET /api/v1/exams/history`
- `POST /api/v1/tutor/ask`
- `GET /api/v1/rewards/me`
- `GET /api/v1/leaderboards`
- `POST /api/v1/redeem`
- `GET/POST /api/v1/community/posts`
- owner-scoped edit/delete/comment/answer/bookmark/follow/report routes

## Teacher

- `GET /api/v1/teacher/overview`
- `GET /api/v1/teacher/students`
- `GET /api/v1/teacher/students/:id/performance` — assignment-scoped
- question author/review routes permitted by policy

## Admin

- `/api/v1/admin/users`
- `/api/v1/admin/questions`
- `/api/v1/admin/imports`
- `/api/v1/admin/redeem-codes`
- `/api/v1/admin/analytics`
- `/api/v1/admin/community/moderation`
- `/api/v1/admin/audit-logs`

## Error envelope

```json
{"ok":false,"error":{"code":"FORBIDDEN","message":"Request is not permitted","requestId":"..."}}
```

Do not expose stack traces, password/account existence, answer keys before exam policy allows them, raw code hashes or internal authorization details.
