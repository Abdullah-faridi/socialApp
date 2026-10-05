# Discere Backend

The backend for **Discere**, a social learning platform where users can share knowledge, interact with others, communicate in real time, and use AI-powered features.

Built with **TypeScript, Express, PostgreSQL, Prisma, Redis, and Socket.IO**.

## Features

- Authentication with JWT and HTTP-only cookies
- User profiles, follows, and role-based access
- Posts, comments, likes, and saved posts
- Personalized For You feed
- Real-time notifications
- Real-time chat and chat rooms
- AI-powered features using Google Gemini
- Redis caching and session management
- Background AI processing with BullMQ
- File uploads using Cloudflare R2
- Request validation, rate limiting, and authorization

## Tech Stack

| Technology    | Purpose                    |
| ------------- | -------------------------- |
| TypeScript    | Application language       |
| Express       | REST API                   |
| PostgreSQL    | Database                   |
| Prisma        | ORM                        |
| Redis         | Caching, sessions & queues |
| Socket.IO     | Real-time communication    |
| BullMQ        | Background jobs            |
| Google Gemini | AI features                |
| Cloudflare R2 | File storage               |

## Architecture

```text
                         ┌──────────────┐
                         │    Client    │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Express    │
                         │     API      │
                         └──────┬───────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
       PostgreSQL            Redis            Cloudflare R2
          Prisma          Cache / Queue        File Storage
                                │
                                ▼
                            BullMQ
                                │
                                ▼
                          AI Worker
                                │
                                ▼
                         Google Gemini

                    Socket.IO
                        │
                        ▼
               Real-time communication
```

## Getting Started

### Requirements

- Node.js
- PostgreSQL
- Redis

### Installation

```bash
git clone <repository-url>
cd socialApp
npm install
```

Create a `.env` file based on `.env.example` and configure the required services.

Generate Prisma Client:

```bash
npx prisma generate
```

Apply database migrations:

```bash
npx prisma migrate dev
```

### Run locally

Start the API:

```bash
npm run dev
```

Start the AI worker:

```bash
npm run worker
```

The API and worker run as separate processes.

## Environment Variables

See [`.env.example`](.env.example) for the required environment variables.

## Available Scripts

```text
npm run dev            Start the API in development
npm run worker         Start the AI worker in development
npm run build          Build the TypeScript project
npm start              Start the production API
npm run start:worker   Start the production AI worker

npm run db:generate    Generate Prisma Client
npm run db:migrate     Run a development migration
```

## Health Check

```http
GET /health
```

The health endpoint verifies the availability of the API's PostgreSQL and Redis dependencies.

## Project

**Discere** is being developed as a full-stack social learning platform.

Frontend: `discere.online`
Backend: `api.discere.online`
