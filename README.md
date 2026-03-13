# Pulse: Real-Time Social Learning Platform

Pulse is a collaborative study ecosystem. Create topic-based rooms, share resources, and use AI to generate quizzes or summaries from materials.

## Tech Stack

- **Frontend:** Angular 21 (Zoneless, Signals), Angular Material.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** MongoDB Atlas.
- **Real-time:** Socket.IO.
- **Infrastructure:** AWS EC2, S3 (Storage), SQS (Queue), Lambda (AI Processing).
- **AI:** Claude / OpenAI API.
- **Testing:** Jest, Karma, Jasmine.

## Key Features

- **Real-Time Study Rooms:** Live chat, presence indicators, and message reactions via WebSockets.
- **AI Study Assistant:** Automated quiz generation and document summarization using AWS SQS and Lambda.
- **Secure Storage:** File uploads to S3 managed through secure presigned URLs.
- **Authentication:** JWT-based auth with access/refresh token rotation.
- **Gamification:** XP points, study streaks, and room leaderboards.
- **Audit Logging:** Detailed tracking of all administrative and user actions.

---

## 📂 Project Structure

```text
pulse/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and Env configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # JWT Auth and RBAC
│   │   ├── models/          # Mongoose schemas (User, Room, Message, etc.)
│   │   ├── routes/          # API endpoints
│   │   ├── websocket/       # Socket.IO logic
│   │   └── utils/           # Encryption and JWT helpers
│   └── tsconfig.json
└── frontend/
    └── (Angular 21 Source)
```
