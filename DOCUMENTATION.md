# Appointly: Comprehensive Project Documentation 🚀

Welcome to the technical documentation for **Appointly**, a premium, glassmorphism-inspired appointment booking platform. This guide explains how every feature, interaction, and back-end logic works within the application.

---

## 1. 🏗️ Tech Stack Overview
- **Frontend**: React (Vite), Framer Motion (animations), Lucide React (icons), Sonner (toasts).
- **Backend**: Node.js & Express.
- **Database**: PostgreSQL with **Prisma ORM**.
- **Real-time**: Socket.io for messaging and live notifications.
- **Mailing**: EmailJS (Node.js SDK) for automated reminders and welcome emails.

---

## 2. 🔐 Authentication & Security
### **Multi-Step Signup**
- **Roles**: Users can sign up as a **Client** (requiring basic info) or a **Provider** (requiring phone, location, specialty, and a bio).
- **Security**: Passwords are hashed using `bcrypt` (10 salts) before being stored.
- **Validation**: Includes real-time email format checks and password strength requirements.

### **Login & Session Management**
- **JWT Token**: Authentication is handled via JSON Web Tokens (30-day expiry), stored locally in the browser.
- **Remember Me**: Optional persistent session logic.
- **Global Password Toggle**: All password fields feature a "show/hide" icon for better UX.

### **Timed Access Logic**
- If an unauthenticated user tries to view a professional's full profile, they are redirected to Login/Signup with a **5-second temporary alert** explaining the requirement.

---

## 3. 🙋 Client Experience (Dashboard)
### **Appointment Management**
- **Booking Flow**: Clients find providers on the landing page, view their services, and book a specific slot.
- **Status Tracking**: Appointments move through `PENDING`, `CONFIRMED`, `COMPLETED`, or `CANCELLED` states.
- **Review System**: Once an appointment is "Completed," the client can leave a star rating and comment.

### **Personalization**
- **Favorites**: Clients can "heart" providers to save them to their dashboard.
- **Notifications**: Real-time alerts for booking confirmations or cancellations.

---

## 4. 🧑‍💼 Provider Experience (Dashboard)
### **Business Management**
- **Service Creation**: Providers can manage multiple service offerings with custom durations and prices.
- **Booking Hub**: A central feed to accept or decline pending appointment requests.
- **Schedule Management**: Real-time updates on "Today's Schedule" and upcoming bookings.

### **Analytics**
- Visual charts (powered by Recharts) showing booking trends and earnings over time.

---

## 5. 💬 Communication Systems
### **Real-time Messaging**
- **Direct Link**: Integrated "Message" buttons on every booking card in both dashboards.
- **Messaging Modal**: A "Quick Reply" popup that allows sending messages without leaving the current dashboard view.
- **History Tab**: A full-featured chat interface (`MessagesTab`) for browsing conversation history.

### **Notification Architecture**
- **Structural Global Bell**: Notifies users about bookings, reminders, and reviews.
- **Contextual Sidebar Badges**: Specifically handles "New Message" alerts to avoid cluttering the main bell icon.

---

## 6. 🤖 Backend Intelligence
### **Automated Reminders (Cron Job)**
- A background task runs every day at 8:00 AM server time.
- It identifies all `UPCOMING` appointments for the following day.
- **EmailJS Integration**: Sends professional email reminders to both the Client and Provider.
- **Socket Notification**: Simultaneously pushes a real-time "Reminder" notification to their dashboards.

### **Socket.io Integration**
- Handles real-time connection status.
- Dynamically joins users to their private rooms (`user_[id]`) for secure, targeted event emitting (messages/notifs).

---

## 7. 🎨 Design & Aesthetic
- **Glassmorphism**: High-blur backdrops, subtle borders, and semi-transparent layers across the dashboard.
- **Mesh Gradients**: Dynamic, animated background gradients on the landing page for a premium feel.
- **Theme Engine**: Support for Dark Mode and Light Mode with persistence in `localStorage`.
- **Framer Motion**: Smooth entry animations, staggered lists, and interactive hover effects.

---

## 8. 🛠️ Developer Commands
- `npm run dev`: Starts the development server.
- `npm run db:clear`: Safely wipes all functional data (bookings, messages, etc.) while keeping the schema.
- `npm run db:seed-5`: Re-populates the database with 5 fresh promo/demo accounts for testing.

---

## 9. 🚀 Final Deployment Guide (Recommended)
This guide explains how to deploy your project for free while keeping **Chat** and **Reminders** fully functional.

### **Step 1: Deploy Backend to [Render.com](https://render.com)**
1.  **Create a New Web Service**: Link your GitHub repository.
2.  **Root Directory**: Set this to `backend`.
3.  **Runtime**: Node.
4.  **Build Command**: `npm install && npx prisma generate`
5.  **Start Command**: `npm start`
6.  **Environment Variables**: add these from your `.env`:
    -   `DATABASE_URL`, `JWT_SECRET`, `PORT=5000`
    -   `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`
7.  **Note your URL**: Once deployed, it will look like `https://your-backend.onrender.com`.

### **Step 2: Deploy Frontend to [Vercel](https://vercel.com)**
1.  **Create a New Project**: Link your GitHub repository.
2.  **Root Directory**: Set this to `frontend`.
3.  **Framework Preset**: Vite.
4.  **Environment Variables**:
    -   `VITE_API_URL`: Set this to your **Render URL** + `/api` (e.g., `https://your-backend.onrender.com/api`).
5.  **Hit Deploy**: Vercel will build and launch your site!

### **Step 3: Update Database**
-   Ensure your database (Supabase or Render PostgreSQL) is accessible and you've run the migrations or seeded the data using `npm run db:seed-5` from your local machine (pointing to the production `DATABASE_URL`).

---

*This project is built for scalability and a world-class user experience.* 🏆
