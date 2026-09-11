<div align="center">

# ✨ Appointly
### *Next-Gen On-Demand Appointment Booking & Specialist Marketplace*

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js_20-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis_Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)

<p align="center">
  <b>A full-stack, enterprise-grade booking management platform connecting clients with verified service specialists in real time.</b>
  <br />
  Featuring intelligent 50km radius geo-matching, high-speed Redis caching with automatic invalidation, interactive Leaflet maps, real-time WebSockets chat with delivery receipts, automated EmailJS & SMS notifications, and role-based client, provider, and admin dashboards.
</p>

</div>

---

## 🌟 Key Features

### 🙋 Client Experience
- **Interactive Specialist Discovery:** Search, filter by category, specialty, maximum pricing, and real-time availability.
- **50 km Geolocation & Radius Search:** 1-click GPS location detection and interactive Leaflet map modal with custom pins.
- **Flexible Appointment Booking:** Real-time slot conflict prevention, multi-service selection, and saved address management.
- **Real-Time Booking Status:** Track appointments across `PENDING`, `CONFIRMED`, `COMPLETED`, and `CANCELLED` states.
- **Ratings & Reviews:** Verified post-service feedback system updating provider aggregate ratings dynamically.
- **Favorites & Saved Providers:** Bookmark trusted specialists for 1-click rebooking.

### 🧑‍💼 Provider Suite
- **Comprehensive Business Hub:** Accept, decline, reschedule, and manage client booking requests.
- **Custom Schedule & Slot Engine:** Configure working days, customizable time slots, and date blackouts.
- **Services & Pricing Catalog:** Create, edit, and categorize service offerings with custom durations and rates.
- **Earnings & Performance Analytics:** Interactive revenue and appointment volume charts powered by Recharts.
- **KYC & Document Verification:** Upload ID credentials with binary file signature validation for admin review.

### 🛡️ Administrative Console
- **Platform Analytics:** Real-time metrics for total users, providers, clients, completed appointments, and reviews.
- **KYC Verification Pipeline:** Review, approve, or reject provider credentials.
- **User & Review Moderation:** Manage user accounts and platform feedback with safe cascading data integrity.

### ⚡ Performance, Real-Time & Security
- **Redis In-Memory Caching:** Sub-millisecond response times for public stats, reviews, and provider listings with automatic cache invalidation and zero-crash database fallback.
- **DDoS & Rate Limiting:** Multi-tiered rate limiters (`authLimiter`, `otpLimiter`, `apiLimiter`) protecting against brute-force attacks and resource exhaustion.
- **Live WebSockets Messaging:** End-to-end real-time chat with typing indicators, online presence, and read receipts.
- **Daily Automated Reminders:** Background cron scheduler triggering EmailJS notifications 24 hours before appointments.
- **SMS OTP Authentication:** Fast2SMS mobile verification alongside secure Google OAuth 2.0 integration.
- **Sound Effects Engine:** Contextual audio feedback for notifications, messages, and booking confirmations.
- **Multi-Language & Theme Support:** Dynamic English/Hindi localization with persistent Dark/Light glassmorphism themes.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Frontend)"]
        UI["React 19 + Vite SPA"]
        Theme["Theme & Language Engine"]
        SocketClient["Socket.IO Client"]
    end

    subgraph Gateway ["Reverse Proxy & Web Server"]
        Nginx["Nginx Reverse Proxy / Load Balancer"]
    end

    subgraph AppLayer ["Application Layer (Backend)"]
        Express["Express 5 REST API"]
        Cache["Redis Cache Middleware"]
        RateLimit["Rate Limiter & Helmet"]
        SocketServer["Socket.IO Server"]
        Cron["Node-Cron Reminders"]
        Auth["JWT & RBAC Middleware"]
    end

    subgraph DataLayer ["Data & External Services"]
        Redis[("Redis 7 (In-Memory Cache)")]
        Prisma["Prisma ORM"]
        Postgres[("PostgreSQL Database")]
        EmailJS["EmailJS Service"]
        SMS["Fast2SMS Gateway"]
        GoogleAuth["Google OAuth 2.0"]
    end

    UI -->|HTTPS / REST| Nginx
    SocketClient <-->|WSS WebSockets| Nginx
    Nginx -->|/api/*| RateLimit
    RateLimit --> Cache
    Cache -->|Cache Hit < 1ms| Express
    Cache <-->|Read / Write Cache| Redis
    Nginx -->|/socket.io/*| SocketServer

    Express --> Auth
    Auth --> Prisma
    SocketServer --> Prisma
    Cron --> Prisma

    Prisma --> Postgres
    Express --> EmailJS
    Express --> SMS
    Express --> GoogleAuth
```

---

## 💻 Tech Stack

| Domain | Technologies |
|---|---|
| **Frontend** | React 19, Vite 6, React Router 7, Framer Motion 12, Lucide React, Recharts, Sonner |
| **Mapping** | Leaflet, React-Leaflet, OpenStreetMap Nominatim Geocoding API |
| **Backend** | Node.js 20 LTS, Express.js 5, Socket.io 4, Node-Cron, Multer, Bcrypt, Helmet |
| **Database & Cache** | PostgreSQL 15+, Prisma ORM 6, Redis 7 (via ioredis) |
| **Security & Rate Limiting** | Express-Rate-Limit, Helmet (CORP/CSP), SHA-256 Hashing, Bcrypt (10 rounds) |
| **Authentication** | JWT (Access & Refresh tokens), Google Auth Library, SHA-256 OTPs |
| **Integrations** | EmailJS, Fast2SMS Gateway |
| **DevOps & Hosting** | AWS EC2 / Lightsail, Nginx, PM2, Docker & Docker Compose, Certbot SSL |

---

## 📁 Repository Structure

```
appointly/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Database schema & relations
│   ├── scripts/                  # DB seeders & maintenance scripts
│   ├── src/
│   │   ├── controllers/          # Business logic & cache invalidation handlers
│   │   ├── cron/                 # Automated daily reminder cron jobs
│   │   ├── middleware/           # Auth, RBAC, Rate-limit, Cache & Upload guards
│   │   ├── routes/               # Express REST route definitions
│   │   ├── utils/                # Sockets, Redis, SMS, and EmailJS helpers
│   │   ├── index.js              # Server entrypoint with Graceful Shutdown
│   │   └── prisma.js             # Singleton Prisma client instance
│   ├── docker-compose.yml        # Multi-container setup (PostgreSQL + Redis)
│   ├── Dockerfile                # Production multi-stage Dockerfile
│   └── ecosystem.config.cjs      # PM2 process manager configuration
│
├── frontend/
│   ├── src/
│   │   ├── api/                  # Modular API clients & token interceptor
│   │   ├── components/           # UI components, modals, and charts
│   │   ├── context/              # Auth, Socket, Theme, and Language providers
│   │   ├── pages/                # Home, Dashboards, Auth, Profile, Contact, 404
│   │   ├── translations/         # Multi-language dictionaries
│   │   ├── utils/                # Geolocation, sound, and toast wrappers
│   │   ├── App.jsx               # Route tree & code-splitting
│   │   └── main.jsx              # Application mount
│   └── vite.config.js            # Vite build configuration with chunk splitting
│
├── nginx.conf                    # Nginx reverse proxy configuration for AWS
└── AWS_DEPLOYMENT_GUIDE.md       # Step-by-step production deployment guide
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: `v20.x` or higher
- **PostgreSQL**: `v14` or higher
- **Redis** *(Optional for local dev, runs automatically with Docker)*: `v7.x`
- **npm** or **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/Ankit8810770036/Appointly.git
cd Appointly
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

Configure your `.env` file:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/appointly?schema=public"
JWT_SECRET="your_jwt_secret_key_here"
FRONTEND_URL="http://localhost:5173"
REDIS_URL="redis://127.0.0.1:6379"
```

Initialize the database & start Redis:
```bash
# Optional: Start PostgreSQL & Redis via Docker
docker compose up -d

# Push Prisma schema to PostgreSQL
npx prisma db push

# Optional: Seed sample specialists and client accounts
npm run db:seed-bulk

# Start backend in development mode
npm run dev
```

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

Start the Vite development server:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🌐 Production Deployment on AWS

For a detailed walkthrough on setting up an **Ubuntu EC2 / Lightsail instance**, configuring **Nginx reverse proxy**, running **PM2**, and obtaining free **Let's Encrypt SSL certificates**, refer to:

👉 **[Complete AWS Deployment Guide (AWS_DEPLOYMENT_GUIDE.md)](./AWS_DEPLOYMENT_GUIDE.md)**

---

## 📡 Key API Endpoints

| Method | Endpoint | Description | Access | Cache |
|---|---|---|---|:---:|
| `GET` | `/api/public/stats` | Landing page statistics | Public | ⚡ 10 min |
| `GET` | `/api/public/site-reviews` | Landing page testimonials | Public | ⚡ 5 min |
| `POST` | `/api/public/contact` | Submit support inquiry | Public | — |
| `POST` | `/api/auth/register` | Register new Client or Provider | Public | — |
| `POST` | `/api/auth/login` | User login & JWT issuance | Public | — |
| `POST` | `/api/auth/google` | Google OAuth Single Sign-On | Public | — |
| `GET` | `/api/providers` | Query specialists with 50km geo-filter | Public | ⚡ 2 min |
| `GET` | `/api/providers/:id` | Get provider profile details | Public | ⚡ 2 min |
| `POST` | `/api/appointments` | Book new appointment slot | Client | — |
| `PATCH` | `/api/appointments/:id/status` | Confirm / Complete / Cancel booking | Authenticated | — |
| `GET` | `/api/messages/conversations` | Fetch real-time message conversations | Authenticated | — |
| `GET` | `/api/admin/stats` | Retrieve platform analytics | Admin | — |
| `GET` | `/api/health` | Service healthcheck probe | Public | — |

---

## 📄 License

This project is open-source and available under the **ISC License**.

---

<div align="center">
  <sub>Built with ❤️ by <b>Ankit Kumar Singh</b>. Star ⭐ this repository if you find it helpful!</sub>
</div>
