# SolarSense AI

**Decentralized. Resilient. Equitable.**

AI-powered peer-to-peer energy trading platform connecting solar-equipped households into a smart grid network. Combines machine learning, real-time weather data, and Google Gemini to enable intelligent energy sharing for resilient, equitable energy distribution.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB)
![Express](https://img.shields.io/badge/Express-4.21-404D59?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white)
![Google AI](https://img.shields.io/badge/Gemini-2.0_Flash-orange?logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Problem

- **Energy waste** — excess residential solar goes unused
- **Peak load strain** — grids struggle with demand spikes
- **Grid vulnerability** — centralized systems fail during outages
- **Access inequality** — costs and availability vary across areas

## Solution

SolarSense creates a community energy sharing network:

- **P2P trading** — buy/sell excess solar energy directly with neighbors
- **AI optimization** — ML predicts energy patterns and suggests trading strategies
- **Real-time market** — dynamic pricing from actual supply and demand
- **Community resilience** — distributed storage maintains power during grid issues

## Key Features

### Live Energy Trading

- Authenticated P2P marketplace with household registration
- Dynamic pricing in Indian Rupees (₹/kWh)
- Full trade lifecycle: create, edit, cancel, apply, approve, share contact
- Mobile-responsive with 44px+ touch targets
- Real-time updates with cross-tab synchronization

### Trade Application System

- Complete workflow: apply → approve/decline → share contact → coordinate
- Automated email notifications for status updates
- Comprehensive status tracking and trade history audit trail

### ML Simulation Engine

The `MLEnergyEngine` implements a hybrid physics + neural network approach:

- **Generation prediction** — physics-based solar calculations enhanced with ML (max 25% ML weight)
- **Demand forecasting** — multi-factor modeling with 8-input neural network (max 20% ML weight)
- **Distribution optimization** — automatic surplus/deficit matching with price optimization
- **Adaptive learning** — continuous confidence updates from prediction accuracy

### Interactive Simulation Dashboard

- 7 isolated demo households (IDs 1000+) separate from real user data
- Live weather integration from Open-Meteo API
- Manual weather and power outage simulation controls

### Google AI Integration

- Gemini 2.0 Flash chat for energy optimization advice
- Network analytics, market intelligence, and performance metrics

## Tech Stack

| Layer        | Technologies                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | React 18, TypeScript 5.8, Vite 7.3, Tailwind CSS, shadcn/ui, TanStack Query v5, Wouter, React Hook Form + Zod, Framer Motion |
| **Backend**  | Express.js 4.21, TypeScript, Drizzle ORM 0.39, PostgreSQL (Neon), bcrypt auth, Express Sessions (PG store), Nodemailer, CORS |
| **AI / ML**  | Google Gemini 2.0 Flash, custom feed-forward neural network, Open-Meteo Weather API, physics-based energy modeling           |
| **Build**    | Vite (client), esbuild (server), Drizzle Kit (migrations), PostCSS                                                           |

## Project Structure

```
SolarSense-AI/
├── client/
│   ├── index.html
│   ├── public/assets/
│   └── src/
│       ├── App.tsx                    # Router & app shell
│       ├── main.tsx                   # Entry point
│       ├── index.css                  # Global styles + Tailwind
│       ├── components/
│       │   ├── navbar.tsx             # Navigation bar
│       │   ├── simulation-dashboard.tsx
│       │   ├── loading-page.tsx
│       │   ├── location-request.tsx
│       │   ├── validation-card.tsx
│       │   ├── mobile-ai-chat-widget.tsx
│       │   ├── storage/               # Energy trading components
│       │   │   ├── storage-types.ts       # Types, schemas, constants, status helpers
│       │   │   ├── use-trade-mutations.ts # 8 mutations in shared hook
│       │   │   ├── trade-card.tsx          # Unified sell/buy trade card
│       │   │   ├── edit-trade-dialog.tsx   # Edit trade form dialog
│       │   │   └── trade-detail-modal.tsx  # Trade result detail modal
│       │   └── ui/                    # shadcn/ui primitives (26 components)
│       ├── pages/
│       │   ├── dashboard.tsx          # Main trading dashboard
│       │   ├── storage-page.tsx       # Trade management hub
│       │   ├── chat.tsx               # AI chat interface
│       │   ├── about.tsx              # About page
│       │   ├── login-page.tsx         # Login
│       │   ├── signup-page.tsx        # Registration
│       │   └── not-found.tsx          # 404
│       ├── hooks/
│       │   ├── use-auth.tsx           # Authentication state
│       │   ├── use-mobile.tsx         # Mobile detection
│       │   └── use-toast.ts           # Toast notifications
│       ├── lib/
│       │   ├── utils.ts              # Formatting & utilities
│       │   ├── queryClient.ts        # TanStack Query config
│       │   ├── location-service.ts   # Geolocation
│       │   └── protected-route.tsx   # Auth route guard
│       └── types/
│           └── speech-recognition.d.ts
├── server/
│   ├── index.ts              # Server entry & startup
│   ├── routes.ts             # All API endpoints
│   ├── storage.ts            # Database CRUD operations
│   ├── auth.ts               # Passport + session auth
│   ├── db.ts                 # PostgreSQL connection (Neon)
│   ├── ml-engine.ts          # Neural network & prediction engine
│   ├── simulation-engine.ts  # Demo simulation with 7 households
│   ├── weather-service.ts    # Open-Meteo API integration
│   ├── gemini-chat.ts        # Google Gemini AI chat
│   ├── ai-service.ts         # AI service utilities
│   ├── email-service.ts      # Nodemailer notifications
│   ├── calculation-service.ts # Energy calculations
│   ├── api-cache.ts          # Server-side caching
│   └── vite.ts               # Vite dev middleware
├── shared/
│   └── schema.ts             # Drizzle schema + Zod validators
├── migrations/                # Drizzle migration SQL files
├── package.json
├── drizzle.config.ts
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── start-production.js
```

## ML Algorithm Details

### Hybrid Prediction Model

```
finalPrediction = (baseline × baselineWeight) + (neuralOutput × mlWeight)

baseline = solarCapacity × weatherMultiplier × timeMultiplier × seasonalMultiplier
mlWeight = min(0.25, historicalAccuracy × confidence × 0.5)
```

**Neural network**: 4-layer MLP `[8, 6, 4, 1]` with sigmoid activation, backpropagation training at learning rate 0.01.

**8 input features**: temperature, cloud cover, wind speed, hour of day, solar capacity, historical trend, season factor, day type.

**Performance**: generation prediction 85–95% accuracy, demand forecasting 80–90%, optimization cycle <100ms for 7 households.

## Database Schema

| Table               | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `users`             | Authentication, email, location (district/state), phone |
| `households`        | Solar capacity, battery, location, address              |
| `energy_trades`     | Buy/sell offers with ₹ pricing and status lifecycle     |
| `trade_acceptances` | Application workflow with status tracking               |
| `energy_readings`   | Historical generation/consumption data                  |
| `chat_messages`     | AI conversation history                                 |

Indexed foreign keys, Zod runtime validation, PostgreSQL-backed sessions.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- Google AI API key (optional, for chat)
- Gmail app password (optional, for email notifications)

### Setup

```bash
git clone <repository-url>
cd SolarSense-AI
npm install
```

Create `.env`:

```env
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
GOOGLE_API_KEY=your_gemini_key
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=your_app_password
CLIENT_URL=http://localhost:5000
```

```bash
npm run db:push    # Push schema to database
npm run dev        # Start dev server at http://localhost:5000
```

### Production Build

```bash
npm run build      # Vite client + esbuild server → dist/
npm start          # Run production server
```

### Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Development server with HMR        |
| `npm run build`   | Production build (client + server) |
| `npm start`       | Start production server            |
| `npm run check`   | TypeScript type check              |
| `npm run db:push` | Push Drizzle schema to database    |

## API Reference

### Auth

| Method | Endpoint        | Description          |
| ------ | --------------- | -------------------- |
| POST   | `/api/register` | User registration    |
| POST   | `/api/login`    | Authentication       |
| GET    | `/api/user`     | Current user profile |
| POST   | `/api/logout`   | Logout               |

### Energy Trading

| Method | Endpoint                        | Description  |
| ------ | ------------------------------- | ------------ |
| GET    | `/api/energy-trades`            | List trades  |
| POST   | `/api/energy-trades`            | Create trade |
| PUT    | `/api/energy-trades/:id`        | Update trade |
| PATCH  | `/api/energy-trades/:id/cancel` | Cancel trade |

### Trade Applications

| Method | Endpoint                                      | Description                  |
| ------ | --------------------------------------------- | ---------------------------- |
| GET    | `/api/my-trade-applications`                  | Applications to your trades  |
| GET    | `/api/trade-acceptances`                      | Your submitted applications  |
| GET    | `/api/trade-offers`                           | Available trades to apply to |
| POST   | `/api/trade-acceptances`                      | Apply to a trade             |
| PATCH  | `/api/trade-acceptances/:id/owner-decision`   | Approve/reject               |
| POST   | `/api/trade-acceptances/:id/share-contact`    | Share contact info           |
| PATCH  | `/api/trade-acceptances/:id/applicant-reject` | Applicant rejects            |
| DELETE | `/api/trade-acceptances/:id`                  | Withdraw application         |

### Market & AI

| Method | Endpoint                  | Description            |
| ------ | ------------------------- | ---------------------- |
| GET    | `/api/market/realtime`    | Live market conditions |
| GET    | `/api/analytics/network`  | Network statistics     |
| GET    | `/api/households`         | User households        |
| POST   | `/api/ai/chat`            | Gemini AI chat         |
| GET    | `/api/simulation/status`  | Simulation status      |
| POST   | `/api/simulation/weather` | Override weather       |
| GET    | `/api/health`             | Health check           |

## Security

- **Auth**: bcrypt password hashing, PostgreSQL session store, HTTP-only secure cookies
- **Validation**: Zod schemas on all API inputs, Drizzle ORM parameterized queries
- **Protection**: CORS configuration, XSS prevention via React, route-level auth guards
- **Data**: environment-based secrets, user data isolation, complete audit trail

## Build Output

```
dist/public/index.html           1.14 kB
dist/public/assets/index.css   146.73 kB  (gzip: 22.33 kB)
dist/public/assets/query.js     43.14 kB  (gzip: 13.27 kB)
dist/public/assets/forms.js     88.10 kB  (gzip: 24.41 kB)
dist/public/assets/ui.js       151.53 kB  (gzip: 50.42 kB)
dist/public/assets/markdown.js 156.57 kB  (gzip: 47.38 kB)
dist/public/assets/radix.js    258.09 kB  (gzip: 82.23 kB)
dist/public/assets/index.js    343.25 kB  (gzip: 74.11 kB)
dist/index.js                  218.60 kB  (server)
```

## Contributing

1. Fork and create a feature branch: `git checkout -b feature/name`
2. Follow existing TypeScript patterns and maintain full type coverage
3. Test your changes: `npm run check && npm run build`
4. Submit a pull request with a clear description

## License

MIT

---

_Last updated: March 2026_
