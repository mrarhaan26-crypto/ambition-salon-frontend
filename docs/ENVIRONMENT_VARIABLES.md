# Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (e.g. `postgresql://postgres:password@127.0.0.1:2620/ambition_salon?schema=public`) |
| `JWT_SECRET` | Yes | — | Secret key for JWT token signing |
| `PORT` | No | `3000` | Backend server port |
| `FRONTEND_URL` | No | `http://localhost:4200` | Allowed CORS origin |
| `SMTP_HOST` | No | — | SMTP server hostname for email delivery |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | No | — | SMTP authentication username |
| `SMTP_PASS` | No | — | SMTP authentication password |

Place these in `Backend_NestJS/.env` file. No secrets are committed to the repository.
