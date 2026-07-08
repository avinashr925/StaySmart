# StaySmart – AI-Enhanced Full-Stack Vacation Rental Platform

StaySmart is a production-quality,  full-stack vacation rental platform enriched with modern AI features. This codebase is refactored from a basic Node/Express/EJS CRUD setup into a robust MVC REST API backend paired with a Next.js (App Router) React & TypeScript frontend. It is optimized for software engineering internship applications at top-tier companies.


#  Project Screenshots

##  Home Page
![Home Page](<screenshots/Home page with Ai assistant.png>)

##  Property Details

![Property Details](<screenshots/Property details.png>)

![price details](<screenshots/Ai price calculator.png>)

## AI Semantic Search

![AI Semantic Search](<screenshots/Ai search bar.png>)

##  Guest Dashboard

![Guest Dashboard](<screenshots/Profile : dashboard.png>)



---

## 🌟 Key Features

### 💻 Frontend (Next.js + Tailwind CSS)
- **Responsive Stays Grid**: Category filters (Beachfront, Mansions, Cabins, Apartments) with smooth card hover animations.
- **Dynamic Property Details**: Beautiful image layout galleries, interactive calendar reservation forms, local map visualizer, and host profiles.
- **Host & Guest Dashboards**:
  - **Guest**: Wishlist collections, booking histories (past, present, and cancelled), and instant checkout/cancellation forms.
  - **Host**: Property listings manager, reservations received log, earnings metrics, and a "Publish Listing" multipart form.
- **Sleek UX/UI**: Light/dark mode themes, toast alerts (`react-hot-toast`), skeleton page loaders, and responsive layout interfaces.

### ⚙️ Backend (Node.js + Express MVC)
- **TypeScript Architecture**: Clean codebase compiling directly to standard JavaScript.
- **Auth & Security**: JWT access token + refresh token rotations alongside mock Google OAuth login integration. Passwords hashed using `bcryptjs`.
- **Advanced Listing Match Filters**: Text search + filters on location coordinates, price thresholds, property specifications, and amenity tags.
- **Double-Booking Prevention**: Date-collision checks verifying calendar availability.
- **Critique Reviews Engine**: Automated recalculation of listing review metrics (average stars and count) via Mongo aggregation pipelines on database updates.
- **WS Notifications (Socket.IO)**: Real-time notification streams.

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

## 📂 Project Structure

```
staySmart/
├── backend/                  # Compiled outputs (target destination of build)
├── config/                   # MongoDB connection & Cloudinary multer adapters
├── controllers/              # REST request handler files (Auth, Listing, Booking, Review, AI)
├── models/                   # Mongoose DB Schemas (User, Listing, Booking, Review, Wishlist)
├── routes/                   # Router definitions mapped to controller methods
├── middlewares/              # JWT verification, Role authorization, validation, error handler
├── validators/               # Input schemas using Zod validation
├── utils/                    # AppError constructor, catchAsync wrapper, upload helpers
├── public/uploads/           # Local fallback directory for static file uploads
├── src/                      # TypeScript backend source root
│   ├── init/                 # DB clean, seeds, and initial records scripting
│   └── server.ts             # Express REST and WebSockets server entrypoint
├── frontend/                 # Next.js App Router client directory
│   ├── src/app/              # Next.js pages (Home, Listings Detail, Guest/Host Dashboards)
│   ├── src/components/       # Reusable layout UI widgets (Navbar, Footer, AuthModal, AIWidget)
│   ├── src/context/          # React Auth Context (session managers)
│   ├── src/services/         # API calling clients (listings, bookings, reviews, wishlist, AI)
│   └── Dockerfile            # Frontend image compilation instructions
├── Dockerfile                # Backend image compilation instructions
├── docker-compose.yml        # Multi-service configuration manager
└── package.json              # Main project packages and scripting shortcuts
```

---

## 🔑 Environment Variables

Create a `.env` file in the project root with the following definitions:

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
```

---

## 🚀 Installation & Running

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB instance running locally or via Docker

### 1. Database Seeding
First, start your MongoDB server. If you have MongoDB installed locally, ensure it is running on port `27017`.
Then, seed the database from the project root:
```bash
# Installs backend packages
npm install

# Seeds users, listings, past reviews, and reservation calendars
npm run seed
```

### 2. Running Locally (Development Mode)
You can start the backend and frontend development servers concurrently:

#### Start Backend (Port `8080`):
```bash
npm run dev
```

#### Start Frontend (Port `3000`):
Open a new terminal session, navigate to the `frontend/` directory, and launch the dev server:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the full-stack system.

### 3. Docker Deployment Setup
You can spin up MongoDB, the Express API backend, and the Next.js frontend together using Docker Compose:
```bash
docker compose up --build
```
This builds and connects all the microservices.

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
| `/api/ai/search` | `POST` | Normal queries semantic search engine | Public |
| `/api/ai/chat` | `POST` | Conversations chatbot planner | Public |
| `/api/ai/predict` | `GET` | Predetermined valuation price calculator | Public |

---

## 💡 Future Enhancements
- **Payment Processing**: Integrate Stripe SDK for real-time guest payouts.
- **Interactive Maps**: Integrate full Google Maps JS API clusters for listing grids.
- **Analytics Dashboard**: Add charts (using Chart.js/Recharts) to track host monthly earnings.
