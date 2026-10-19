# IssueFlow

IssueFlow is a MERN-based issue tracking and team collaboration application. It helps teams organize projects, create and assign issues, track status and priority, and review comments and activity history in one place.

## Features

- JWT-based registration and login
- Team creation and member management
- Project creation and project-level issue tracking
- Issue types, priorities, status updates, assignees, and search/filter controls
- Comments and chronological activity history
- Dashboard summary for projects and issues
- React + Vite frontend and Express + MongoDB backend

## Tech Stack

- **Frontend:** React, Vite, React Router, Axios, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens and bcryptjs
- **Testing:** Vitest and Supertest were used during development

## Project Structure

```text
issueflow/
├── client/             # React + Vite frontend
└── server/             # Express API and MongoDB models
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    └── server.js
```

## Requirements

- Node.js (LTS recommended)
- npm
- MongoDB connection string

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd issueflow
```

### 2. Configure the backend

Create `server/.env`:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
```

Do not commit `.env` files or production secrets.

Install backend dependencies and start the API:

```bash
cd server
npm install
npm run dev
```

If the project does not define a `dev` script, use the start command declared in `server/package.json` (for example, `npm start`).

### 3. Configure the frontend

Create `client/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

In another terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Demo Account

The demo-user seed script creates sample accounts for local evaluation. After running it, use the following account to sign in:

| Field | Value |
|---|---|
| Email | `demo.admin@issueflow.local` |
| Password | `IssueFlowDemo2026!` |
| Role | Admin |

These are **local demo credentials only**. Do not use this password for a real account or deploy this seeded account to a public production environment.

## Seed Demo Users

The seed script creates one admin and three regular demo users. Existing accounts with the same email addresses are skipped; their passwords are not overwritten.

From the repository root, save the script at `server/scripts/seedUsers.js` and run:

```bash
cd server
node scripts/seedUsers.js
```

The script expects `MONGODB_URI` to be set in `server/.env`. It stores bcrypt password hashes, not plain-text passwords, in MongoDB.

## API Overview

The API is served under `/api`.

| Area | Example endpoints |
|---|---|
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Teams | `GET /api/teams`, `POST /api/teams`, `POST /api/teams/:teamId/members` |
| Projects | `GET /api/teams/:teamId/projects`, `POST /api/teams/:teamId/projects`, `GET /api/projects/:projectId` |
| Issues | `GET /api/projects/:projectId/issues`, `POST /api/projects/:projectId/issues`, `GET /api/issues/:issueId`, `PATCH /api/issues/:issueId` |
| Comments | `GET /api/issues/:issueId/comments`, `POST /api/issues/:issueId/comments` |
| Activity | `GET /api/issues/:issueId/activity` |
| Dashboard | `GET /api/dashboard/summary` |

Authenticated endpoints require a bearer token unless the route is explicitly public.

## Notes

- The application is a portfolio project. Demo data is intended for evaluation and local development.
- The exact available npm scripts depend on the `package.json` files in the repository.
- Keep database credentials and JWT secrets out of source control.


