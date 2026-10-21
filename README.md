# ShieldDB — Smart Data Masking for PII Protection

![ShieldDB banner](docs/images/shielddb-banner.png)

**ShieldDB** helps protect personally identifiable information (PII) through **role-based data masking at query time**. Explore sensitive-data scanning, masking policies, role-specific query results, and audit activity—while preserving the original customer records.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com/)

## Live Demo

- **Application:** [Open ShieldDB](https://shield-h1l3hshmm-shaikmusa3690-5872s-projects.vercel.app/)
- **Source code:** [GitHub repository](https://github.com/SkMusa786/ShieldDB)

## Demo Login Credentials

Use these demo accounts to explore the role-specific experience:

| Role | Email | Password |
|---|---|---|
| Admin | `admin-test@example.com` | `ShieldDB@123` |
| Support Staff | `support-test@example.com` | `ShieldDB@123` |
| Data Analyst | `analyst-test@example.com` | `ShieldDB@123` |

> **Demo security notice:** These are shared demo credentials and may be visible to anyone who can access this repository. Use them only if they are still enabled for the public demo. Never use these credentials for real accounts or sensitive data. Rotate or disable them if the demo environment is not intended for public access.

## Features

- **PII Scanner** — identify likely sensitive columns using column names, patterns, and rules.
- **Dynamic masking** — return different representations of sensitive fields according to the user's role.
- **Role-based access** — Admin, Support Staff, and Data Analyst experiences.
- **Access policies** — manage which fields are masked and how.
- **Query Playground** — test queries and inspect role-dependent results.
- **Audit logs** — review relevant authentication and data-access activity.
- **Secure authentication** — server-side session validation and role checks.

## Screenshots

Capture screenshots from the live application and add them to `docs/images/` with these filenames:

| Dashboard | Role-based masking |
|---|---|
| `docs/images/dashboard.png` | `docs/images/role-based-masking.png` |

| PII Scanner | Audit Logs |
|---|---|
| `docs/images/pii-scanner.png` | `docs/images/audit-logs.png` |

## Architecture

![ShieldDB architecture](docs/images/shielddb-architecture.png)

At a high level, the Next.js interface calls server-side API routes. The backend validates the user's session and role, applies configured masking policies to query results, and stores application data in Neon PostgreSQL. Relevant activity can be recorded in audit logs.

## Tech Stack

- **Application:** Next.js, React, TypeScript
- **Database:** Neon PostgreSQL
- **Authentication:** custom server-side authentication and session handling
- **Deployment:** Vercel

## Run Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/SkMusa786/ShieldDB.git
   cd ShieldDB
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` in the project root:

   ```env
   DATABASE_URL="your_postgresql_connection_string"
   ```

   Use a development or staging database. Keep the real connection string private and never commit `.env.local`.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed in your terminal (typically `http://localhost:3000`).

## Security Notes

- Use a dedicated database role with only the permissions the application needs.
- Never commit database credentials, tokens, or production secrets.
- Do not reuse demo passwords for real users.
- Review dependency audit findings and test authorization before production use.
- Do not enable account-provisioning or setup-only flags in production.

## Project Goal

ShieldDB demonstrates policy-driven, role-aware masking to help reduce unnecessary exposure of sensitive customer information, alongside scanning, query testing, and audit visibility.

---

*Built as a security-focused web application project.*
