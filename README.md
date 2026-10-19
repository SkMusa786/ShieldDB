# ShieldDB --- Smart Data Masking for PII Protection

![ShieldDB banner](docs/images/shielddb-banner.png)

**ShieldDB** helps protect personally identifiable information (PII) by
applying **role-based data masking at query time**. It provides a
dashboard to inspect sensitive data, manage masking policies, test
queries, and review audit activity---without needing to overwrite the
original customer values.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Deployed on
Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com/)

## Features

-   **PII Scanner** --- identify likely sensitive columns using column
    names, patterns, and rules.
-   **Dynamic masking** --- return different representations of
    sensitive fields according to the user's role.
-   **Role-based access** --- Admin, Support Staff, and Data Analyst
    experiences.
-   **Access policies** --- manage which fields are masked and how.
-   **Query Playground** --- safely test queries and inspect
    role-dependent results.
-   **Audit logs** --- review relevant authentication and data-access
    activity.
-   **Secure authentication** --- server-validated roles and protected
    sessions.

## Screenshots

Add screenshots captured from your running deployment to `docs/images/`
using these filenames:

  Dashboard                     Role-based masking
  ----------------------------- --------------------------------------
  `docs/images/dashboard.png`   `docs/images/role-based-masking.png`

  PII Scanner                     Audit Logs
  ------------------------------- ------------------------------
  `docs/images/pii-scanner.png`   `docs/images/audit-logs.png`

## Architecture

![ShieldDB architecture](docs/images/shielddb-architecture.png)

The application uses a Next.js interface and server-side API layer, with
authentication and authorization checks before sensitive operations. The
masking layer applies policies to query results, while PostgreSQL stores
application data, policies, and audit records.

## Tech stack

-   **Frontend / application:** Next.js, React, TypeScript
-   **Database:** Neon PostgreSQL
-   **Authentication:** custom server-side authentication and session
    handling
-   **Deployment:** Vercel

## Run locally

1.  Clone the repository:

    ``` bash
    git clone https://github.com/SkMusa786/ShieldDB.git
    cd ShieldDB
    ```

2.  Install dependencies:

    ``` bash
    npm install
    ```

3.  Create `.env.local` in the project root and configure your
    PostgreSQL connection:

    ``` env
    DATABASE_URL="your_postgresql_connection_string"
    ```

    Use a development/staging database and keep the real connection
    string private. Never commit `.env.local`.

4.  Start the development server:

    ``` bash
    npm run dev
    ```

5.  Open the local URL shown in the terminal (typically
    `http://localhost:3000`).

## Environment and security notes

-   Use a dedicated database role with only the permissions the
    application needs.
-   Keep database credentials and secrets out of source control.
-   Use unique credentials for each environment; do not reuse demo
    passwords in production.
-   Review dependency audit findings and test authorization before
    production use.
-   Do not enable account-provisioning or setup-only flags in
    production.

## Links

-   **Repository:** https://github.com/SkMusa786/ShieldDB
-   **Live application:**
    https://shield-h1l3hshmm-shaikmusa3690-5872s-projects.vercel.app/

## Project goal

ShieldDB demonstrates how sensitive customer information can be
protected through **policy-driven, role-aware masking**, while
supporting operational visibility through scanning, query testing, and
audit logs.

------------------------------------------------------------------------

*Built as a security-focused web application project.*
****
