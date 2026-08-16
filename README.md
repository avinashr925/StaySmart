# StaySmart – AI-Enhanced Full-Stack Vacation Rental Platform

StaySmart is a production-quality, full-stack vacation rental platform enriched with modern AI features. The codebase is organized into an Express + TypeScript MVC REST API backend paired with a Next.js (App Router) React & TypeScript frontend.

---

## 📂 Project Architecture

```text
StaySmart/
│
├── frontend/                 # Next.js App Router Frontend
│   ├── src/                  # React components, contexts, and api services
│   ├── public/               # Static assets
│   ├── package.json          # Frontend packages and scripts
│   ├── tsconfig.json         # Frontend TypeScript configuration
│   └── ...
│
├── backend/                  # Express + TypeScript Backend
│   ├── src/                  # TypeScript source files
│   │   ├── config/           # Database, Gemini, and Cloudinary settings
│   │   ├── controllers/      # REST API request handlers
│   │   ├── middlewares/      # Auth verification and input validation middlewares
│   │   ├── models/           # Mongoose schemas (User, Listing, Booking, etc.)
│   │   ├── routes/           # Routing definitions mapped to controllers
│   │   ├── services/         # Payments, PDFs, geodata, and AI services
│   │   ├── utils/            # Logging, catchAsync, AppError
│   │   ├── validators/       # Zod schemas for input validation
│   │   ├── init/             # Database verification; no demo-data seeding
│   │   └── server.ts         # Express and Socket.IO server entry point
│   ├── public/uploads/       # Generated/local public assets only
│   ├── package.json          # Backend packages and scripts
│   ├── tsconfig.json         # Backend TypeScript configuration
│   └── ...
│
├── docker-compose.yml        # Multi-service configuration manager
├── .gitignore                # Global git ignore configuration
└── README.md                 # Project documentation
```

---

## 🌟 Key Features

### 💻 Frontend (Next.js + Tailwind CSS)
- **Responsive Stays Grid**: Category filters (Beachfront, Mansions, Cabins, Apartments) with smooth card hover animations.
- **Dynamic Property Details**: Image layouts, interactive calendars, maps, and host profiles.
- **Host & Guest Dashboards**:
  - **Guest**: Wishlist collections, booking histories, checkouts, and cancellations.
  - **Host**: Property manager, reservation logs, earnings metrics, and a listing publishing form.
- **Sleek UI/UI**: Light/dark mode themes, toast alerts (`react-hot-toast`), skeleton page loaders, and responsive layouts.

### ⚙️ Backend (Node.js + Express MVC)
- **TypeScript Architecture**: Clean codebase compiling directly to standard JavaScript.
- **Auth & Security**: JWT access token + refresh token rotation and Google OAuth integration. Passwords hashed using `bcryptjs`.
- **Advanced Listing Match Filters**: Text search + filters on location coordinates, price thresholds, property specifications, and amenity tags.
- **Double-Booking Prevention**: Date-collision checks verifying calendar availability.
- **Critique Reviews Engine**: Recalculates reviews metrics (average rating and count) via Mongo aggregation pipelines on database updates.
- **Real-time WebSockets (Socket.IO)**: Real-time notification streams.

### 🧠 AI Features (Google Gemini Integration)
- **AI Semantic Search**: Translates natural language prompts like *"I want a quiet beachfront villa under ₹6000"* into structured database queries.
- **AI Travel Assistant Widget**: A floating chat dialog suggesting custom itineraries and recommending stays based on database contexts.
- **AI Price Prediction Tool**: Suggests fair value estimates based on specifications and neighborhood baselines.
- *Supports robust heuristic pattern matching when Gemini API keys are omitted.*

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | Node.js + Express.js (TypeScript) |
| **Frontend Framework** | Next.js (App Router) + React + TypeScript |
| **Primary Database** | MongoDB (Mongoose ODM) |
| **Asset CDN Storage** | Cloudinary (via Multer storage adapters) |
| **WebSockets** | Socket.IO (for real-time events) |
| **AI Processing** | Google Gemini API (`@google/generative-ai`) |
| **Styling Systems** | Tailwind CSS + Lucide Icons + Framer Motion |
| **Containerization** | Docker + Docker Compose |

---

## 🔑 Environment Variables

### Backend Configuration (`backend/.env`)
Create a `backend/.env` file with the following variables:
```env
PORT=8080
MONGO_URL=mongodb://127.0.0.1:27017/staysmart
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# JWT Secret Keys
JWT_ACCESS_SECRET=your_secure_jwt_access_secret_key
JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret_key
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Google OAuth Integration
GOOGLE_CLIENT_ID=your_google_client_id_here

# Cloudinary Integration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# AI Features Integration
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash

# Razorpay (required for real checkout)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### Frontend Configuration (`frontend/.env`)
Create a `frontend/.env` file with the following variables:
```env
# Google OAuth Integration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# API Connection
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

## 💳 Real Payment Flow

StaySmart uses **Razorpay Standard Checkout** only. There are no simulated orders, fake signatures, fake QR payments, wallet credits, or fallback payment gateways.

1. Create a Razorpay account and generate Test Mode keys first.
2. Put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a strong `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`.
3. The backend creates a Razorpay Order for every checkout.
4. Razorpay Checkout handles cards and supported UPI/payment methods.
5. The browser sends the returned payment ID, order ID, and signature to the backend.
6. The backend verifies the signature, verifies the payment belongs to the server-created order, checks that Razorpay reports the payment as `captured`, and only then confirms the booking.
7. Configure the Razorpay webhook endpoint as `/api/payments/webhook` on a public HTTPS URL and subscribe to `payment.captured` and `payment.failed`.
8. After testing successfully, replace Test Mode credentials with Live Mode credentials.

Never put `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in the frontend.

## 🚀 Installation & Running Locally

### Prerequisites
- Node.js (v20+ recommended)
- MongoDB instance running locally or via Docker

### 1. Database Seeding
Ensure MongoDB is running (default: `mongodb://127.0.0.1:27017/staysmart`). Then run the seeding script:
```bash
cd backend
npm install
npm run seed
```
This command only verifies the database connection. It never creates demo users, listings, reviews, bookings, or payments.

### 2. Running the Backend Server
Start the development server:
```bash
cd backend
npm run dev
```
The server starts on `http://localhost:8080`.

### 3. Running the Frontend Server
Open a new terminal window, navigate to the `frontend/` directory, and start the Next.js development server:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to interact with StaySmart!

---

## 🐳 Docker Deployment Setup

You can build and run MongoDB, the Express backend, and the Next.js frontend together using Docker Compose:
```bash
docker compose up --build
```
This will spin up the services:
- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:8080`
- **MongoDB**: `localhost:27017`

---

## 📊 API Documentation Summary

| Endpoint | Method | Description | Authentication |
| :--- | :--- | :--- | :--- |
| `/api/auth/signup` | `POST` | Registers a new Guest/Host user | Public |
| `/api/auth/login` | `POST` | Auths email and sets JWT cookies | Public |
| `/api/auth/refresh` | `POST` | Renews access tokens using refresh keys | Public |
| `/api/auth/google` | `POST` | Signs in / Registers users via Google ID tokens | Public |
| `/api/listings` | `GET` | Lists all properties (supports search & filters) | Public |
| `/api/listings` | `POST` | Publishes a listing (multipart uploads) | Host / Admin |
| `/api/listings/:id` | `GET` | Fetches details and review arrays for listing | Public |
| `/api/bookings` | `POST` | Schedules listing reservation (prevents overlapping) | Guest |
| `/api/bookings/guest`| `GET` | Retrieves guest booking log | Guest |
| `/api/bookings/host` | `GET` | Retrieves reservations received for Host properties | Host / Admin |
| `/api/reviews/listing/:listingId` | `POST` | Submits a critique rating (up to 3 images) | Guest |
| `/api/wishlist/toggle`| `POST` | Saves/Removes property from saved listing collections | Guest |
| `/api/payments/checkout` | `POST` | Creates a real Razorpay order and a pending booking | Guest |
| `/api/payments/confirm` | `POST` | Verifies Razorpay signature/capture and confirms booking | Guest |
| `/api/payments/webhook` | `POST` | Processes signed Razorpay payment events | Razorpay |
| `/api/payments/invoice/:bookingId` | `GET` | Returns the paid booking invoice | Guest / Host / Admin |
| `/api/ai/search` | `POST` | Normal queries semantic search engine | Public |
| `/api/ai/chat` | `POST` | Conversations chatbot planner | Public |
| `/api/ai/predict` | `GET` | Predetermined valuation price calculator | Public |
