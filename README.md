# StaySmart 🏡
### AI-Enhanced Full-Stack Vacation Rental Platform

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-success?logo=vercel&logoColor=white)](https://stay-smart-bice.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-StaySmart-blue?logo=github&logoColor=white)](https://github.com/avinashr925/StaySmart)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node/Express](https://img.shields.io/badge/Backend-Node%2FExpress-4f46e5?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange?logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

StaySmart is an AI-enhanced full-stack vacation rental platform designed to provide a streamlined, intelligent booking and listing experience. Built around an **Express + TypeScript MVC REST API** backend and a **Next.js 16 (App Router) React & TypeScript** frontend, the platform integrates generative AI models for query parsing, geospatial mapping for discovery, WebSockets for real-time guest-host communications, and multi-channel payment options.

---

## 🚀 Live Demo & Codebase
*   **Production Deployment URL**: [https://stay-smart-bice.vercel.app/](https://stay-smart-bice.vercel.app/)
*   **GitHub Repository URL**: [https://github.com/avinashr925/StaySmart](https://github.com/avinashr925/StaySmart)

---

## 📸 Product Showcase

### 1. 🏠 Home & Discovery Experience
The home landing interface aggregates the main stay search panel (supporting city parameters, booking date ranges, and guest size counts), quick category filters (Beachfront, Mansions, Cabins, Apartments), and a responsive layout displaying featured vacation properties.

| Search Hero Portal Page | Category Browse selector | Stays Browse Grid |
| :---: | :---: | :---: |
| ![Landing Hero](Screenshots/Homepage_1.png) | ![Categories Selector](Screenshots/Homepage_2.png) | ![Featured Grid Listings](Screenshots/homepage_3.png) |

---

### 2. 🔎 Explore, Listings & Map Discovery
The explore panel supports multi-parameter filtering, allowing guests to search by price range, guest count, bedroom count, and specific amenity tags. Listing results are plotted as custom markers on an interactive geolocated map.

| Property Grid View | Interactive Geospatial Map Discovery |
| :---: | :---: |
| ![Filter Listings Grid](Screenshots/Listings.png) | ![Geographical Leaflet Map](Screenshots/map.png) |

---

### 3. 🏡 Property Details Page
The Property Details page presents images, nightly rates, check-in rules, host information, dynamic weather projections, and nearby points of interest. 
*(No separate screenshot is provided for this section; the details page integrates parameters verified in the Listings and Map views).*

---

### 4. ➕ Host Listing Creation Workflow
Hosts publish rental spaces through a multi-step workflow that collects property specifics, location parameters, and house rules.

| Step 1: Listing Details | Step 2: Location Map Picker | Step 3: Amenity Setup |
| :---: | :---: | :---: |
| ![addlisting_1](Screenshots/addlisting_1.png) | ![addlisting_2_location map](Screenshots/addlisting_2_location%20map.png) | ![addlisting_3](Screenshots/addlisting_3.png) |

| Step 4: Images Gallery | Step 5: House Rules |
| :---: | :---: |
| ![addlisting_4](Screenshots/addlisting_4.png) | ![hosing rules](Screenshots/hosing%20rules.png) |

---

### 5. 📅 Availability & Calendar Management
Hosts manage stay availability by toggling blackout ranges and booking intervals on a calendar interface.

<div align="center">
  <img src="Screenshots/calendarfor%20host%20to%20block%20dates.png" alt="Blackout Calendar Date Picker" width="60%" />
</div>

---

### 6. 🏠 Host Management Dashboard
The Host Dashboard provides tools for listing controls, unread message alerts, reservation logs, and dynamic price evaluations. The interface supports native light and dark modes.

| Light Mode Dashboard | Dark Mode Dashboard |
| :---: | :---: |
| ![Host Dashboard Light](Screenshots/Host%20dashboard_light%20mode.png) | ![Host Dashboard Dark](Screenshots/Host%20dash%20board_darkmode.png) |

<div align="center">
  <img src="Screenshots/Host%20dashboard%20_1.png" alt="Host Analytics Panel" width="85%" />
</div>

#### Listing Inventory Management (Host Subsection)
The inventory list allows hosts to quickly edit listing fields, delete active stays, and chat directly with guests.

<div align="center">
  <img src="Screenshots/listing%20_message_edit_delete_all.png" alt="Listing Manager Table" width="85%" />
</div>

---

### 7. 💰 AI Dynamic Pricing & Revenue Intelligence
The Host Dashboard incorporates an AI pricing analyzer that evaluates local competitor stays, user reviews, and seasonality adjustments to recommend nightly rates, occupancy rates, and annual revenue forecasts.

<div align="center">
  <img src="Screenshots/AI%20Dynamic%20pricing.png" alt="AI Dynamic Pricing" width="85%" />
</div>

---

### 8. 🤖 AI Travel Assistant
A floating chat interface powered by Google Gemini. The assistant dynamically queries MongoDB to suggest properties matching guest criteria (RAG pattern) and builds custom travel itineraries.

<div align="center">
  <img src="Screenshots/Ai%20chat%20assistant.png" alt="AI Assistant Conversation" width="60%" />
</div>

---

### 9. 💬 Real-Time Guest & Host Messaging
A real-time messaging pipeline powered by Socket.IO allows hosts and guests to chat, manage check-in details, and exchange attachment files.

| Light Theme Messaging | Dark Theme Messaging |
| :---: | :---: |
| ![Chat Light](Screenshots/chatinbox_lightmode.png) | ![Chat Dark](Screenshots/chat%20inbox_darkmode.png) |

---

### 10. 🔐 Authentication & Account Access
StaySmart supports credentials-based login and signup alongside Google and GitHub OAuth portals.

| Light Mode Registration | Dark Mode Registration |
| :---: | :---: |
| ![Signup Light](Screenshots/Signup%20page_light%20mode.png) | ![Signup Dark](Screenshots/Signup%20page_dark%20mode.png) |

<div align="center">
  <img src="Screenshots/Login%20page.png" alt="Credentials Login Page" width="50%" />
</div>

---

### 11. 💳 Booking & Payments Checkout
The checkout wizard displays stay breakdowns, applied coupon codes, and processing fees. It handles credit card and wallet payments via Razorpay.

<div align="center">
  <img src="Screenshots/Payment.png" alt="Card Payment Portal Form" width="55%" />
</div>

---

### 12. 💸 UPI Payment Workflow
For offline options, guests can transfer booking costs manually by submitting transaction reference details for host verification.

<div align="center">
  <img src="Screenshots/payment_upi.png" alt="UPI Manual Checkout Form" width="55%" />
</div>

---

### 13. 🧾 Booking Receipt & Invoice
Upon successful checkout, StaySmart compiles booking details into a PDF receipt layout for direct download.

<div align="center">
  <img src="Screenshots/Payment%20slip.png" alt="PDF Billing Invoice Receipt" width="55%" />
</div>

---

### 14. ✅ Booking Confirmation
Successful bookings trigger a confirmation summary modal.

<div align="center">
  <img src="Screenshots/payment_conformation.png" alt="Successful Booking Confirmation Screen" width="55%" />
</div>

---

## 🧩 Feature Matrix

| Feature Module | Technical Status | Implementation Details / Dependencies |
| :--- | :---: | :--- |
| **Vacation Rental Discovery** | ✅ Implemented | Grid display, category filters, destination search, and date availability |
| **Property Details Page** | ✅ Implemented | Details display, Leaflet maps, host details, and booking form |
| **Interactive Maps** | ✅ Implemented | Leaflet.js rendering geocoded property markers |
| **Geocoding** | ✅ Implemented | Address translation via Nominatim OpenStreetMap API |
| **Reverse Geocoding** | 🔜 Planned | Dynamic address lookup from map pin placement |
| **AI Semantic Search** | ⚙️ Configuration-dependent | Gemini-1.5-flash parses query strings; falls back to regex keywords |
| **AI Travel Assistant** | ⚙️ Configuration-dependent | Concierge chat with MongoDB RAG stay recommendations; falls back to template replies |
| **AI Dynamic Pricing** | ⚙️ Configuration-dependent | Competitor listing valuations + rating weights + Gemini dynamic prompt suggestions |
| **Revenue Forecasting** | ⚙️ Configuration-dependent | 12-month projections based on listing history and LLM insights |
| **Guest Dashboard** | ✅ Implemented | Bookings manager, cancellation request overrides, profile edits, wishlists |
| **Host Dashboard** | ✅ Implemented | Overview stats (payouts, listings count), calendar dates blocker, listing CRUD, custom coupons |
| **Listing Management** | ✅ Implemented | Complete CRUD operations for host properties |
| **Wishlist / Favorites** | ✅ Implemented | Toggle and save listings to database collection |
| **Reviews & Ratings** | ✅ Implemented | Guest reviews with ratings (1-5), comments, and up to 3 attachments; once-per-user constraint |
| **Real-time Chat** | ✅ Implemented | Socket.IO WebSockets for instant message streams and typing status indicators |
| **Light/Dark Mode** | ✅ Implemented | Next-Themes class adjustments synchronized across application components |
| **Booking Engine** | ✅ Implemented | Calendar date overlap prevention and double-booking checks |
| **Razorpay Payments** | ⚙️ Configuration-dependent | Razorpay Checkout SDK + webhook verification for order confirmation |
| **UPI Manual Flow** | ✅ Implemented | Reference key entries matched against reservation listings |
| **PDF Invoice** | ✅ Implemented | Server-side PDFKit receipt compilation |
| **Authentication** | ✅ Implemented | Bcryptjs password hashing + JWT Access and Refresh token rotation |
| **OAuth Integration** | ⚙️ Configuration-dependent | Google and GitHub client authentication |
| **Image Upload System** | ⚙️ Configuration-dependent | Cloudinary integration; falls back to local disk storage in development |
| **Admin Controls** | ✅ Implemented | Analytics overview, user suspensions, host registration approvals, feature flags |
| **Responsive UI** | ✅ Implemented | Responsive CSS Tailwind grids, flexible flexboxes, and mobile drawer interfaces |

---

## 🤖 AI & Intelligent Features

StaySmart integrates generative artificial intelligence using the `@google/generative-ai` SDK, powered by the `gemini-1.5-flash` model. These features fail gracefully to local rule engines if the Gemini API key is missing.

### 1. AI Semantic Search
*   **User Value**: Allows guests to find properties using natural-language search phrases (e.g., *"quiet cabin in Goa under ₹5000 with a swimming pool"*).
*   **Technical Mechanism**: Sends the query string to Gemini. The model returns a structured JSON mapping parsed query constraints (city, priceMax, propertyType, bedrooms, guests, key search tags, and `aiRationale`). The backend maps this JSON schema directly to a MongoDB query.
*   **Fallback Mechanism**: Parses queries locally using regular expressions for keywords (e.g., "beach", "pool", "ac", "wifi"), numerical bounds for pricing, and matches predefined city tags.

### 2. AI Travel Assistant Chatbot
*   **User Value**: Offers a conversational virtual assistant to suggest stays and sightseeing activities.
*   **Technical Mechanism**: Implemented in `AiAssistant.tsx`. Prior to sending the query to Gemini, the backend uses parsed query parameters to retrieve up to 8 matching stays from MongoDB (RAG pattern) and injects them into the system prompt.
*   **Fallback Mechanism**: Returns template responses detailing public transport tips and basic travel guidelines.

### 3. AI Dynamic Pricing & Price Prediction
*   **User Value**: Provides hosts with dynamic pricing suggestions to optimize nightly rates.
*   **Technical Mechanism**: Traced in `pricing.ts`. It queries similar listings within the same city. The competitor average, listing ratings, and amenity counts are evaluated by Gemini to suggest target prices and occupancy estimates.
*   **Fallback Mechanism**: Calculates average prices of competitor listings in the same city, applying adjustments based on rating thresholds and amenity ratios.

### 4. Revenue Forecasting & Analytics
*   **User Value**: Displays projected occupancy and earnings curves.
*   **Technical Mechanism**: Traced in `forecasting.ts`. It combines base daily prices with seasonal occupancy rates to generate a 12-month revenue forecast.
*   **Fallback Mechanism**: Evaluates baseline occupancy averages (65-75% depending on rating) and applies a seasonal multiplier array to build chart data.

---

## 🗺️ Maps, Geolocation & Travel Context

StaySmart uses geospatial services to add location context to listing search, explore, and details pages.

1.  **Map Display**: Powered by Leaflet.js inside `PropertyMap.tsx`. It processes GeoJSON Point coordinates `[longitude, latitude]` stored in listings, displaying custom marker pins for all properties matching active searches.
2.  **Geocoding Address Translator**: When a host publishes a listing, the controller calls the Nominatim OpenStreetMap API:
    `https://nominatim.openstreetmap.org/search?format=json&q={address}`
    If Nominatim resolves coordinates, they are saved as a GeoJSON point. If it fails, the host is prompted to enter coordinates manually.
3.  **Dynamic Attraction Contexts**: Traced in `geodataService.ts`. Prior to displaying listing details, the backend queries the OpenStreetMap Overpass API for tourism markers, viewpoints, museums, restaurants, and cafes within a 1.5km to 3km radius. Results are returned as "Nearby Attractions".
4.  **Weather Forecasts**: The details page fetches current weather parameters for the property's latitude and longitude from the Open-Meteo API.
5.  **Caching Strategy**: OSM geodata queries and weather responses are cached in a `GeodataCache` MongoDB collection. Weather caches expire in 4 hours, while attraction caches persist for 7 days.

---

## 🏠 Host Experience

*   **Host Onboarding**: Hosts complete onboarding before publishing listings. The profile requires bank details (account holder name, encrypted account number, bank name, IFSC, UPI ID) and GST details (GSTIN, legal name).
*   **Listing CRUD**: Hosts publish properties through forms collecting details: title, description, nightly price, street address, category type, capacity limits, rules, and image attachments.
*   **Host Operations Dashboard**: Exposes summary counts (total listings, reservations count, monthly revenue), active property performance status toggles, and dynamic pricing metrics.
*   **Coupon Management**: Hosts issue custom discount codes, tracking usage, active states, and expiry dates.
*   **Reservation Control**: Hosts monitor check-in dates, guest names, total payouts, and active booking statuses (Pending, Confirmed, Cancelled).
*   **Direct Chat**: Hosts chat with guests about check-in parameters directly inside the dashboard workspace.

---

## 👤 Guest Experience

*   **Property Discovery**: Guests browse listings using category sliders, filters, or map searches.
*   **RAG Assistant Chat**: Guests ask the AI assistant for recommendations, receiving selections pulled from MongoDB.
*   **Property Details**: Exposes high-resolution image galleries, amenities lists, host details, previous ratings, local weather forecasts, nearby attractions, and booking calendars.
*   **Wishlist Collections**: Guests toggle stays into wishlists, stored per user in MongoDB.
*   **Checkout & Billing**: Details price breakdowns (accommodation cost, taxes, cleaning fees, platform commission, coupon deductions). Generates server-side PDF invoice receipts.
*   **Feedback Critiques**: Guests submit ratings (1 to 5) and commentary with up to 3 image uploads. The system prevents duplicate critiques from the same guest on a listing.

---

## 🏗️ Technical Architecture

The following diagram illustrates the interaction between the React client, Express API, MongoDB database, and external integrations:

```mermaid
graph TD
    subgraph Client [Next.js Web App]
        UI[React 19 Components]
        NXT[Next.js 16 App Router]
        THM[Theme Provider next-themes]
        SOCK_C[Socket.io-client]
    end

    subgraph Server [Express REST & WS API]
        SVR[Server src/server.ts]
        SOCK_S[Socket.io Server]
        RTR[Router Middleware]
        AUTH[Auth/Ownership Middleware]
        LMT[Rate Limiters: auth, ai, api]
        
        subgraph Controllers [MVC Controllers]
            AC[AuthController]
            LC[ListingController]
            BC[BookingController]
            AIC[AIController]
            PC[PaymentController]
        end

        subgraph Services [Business Logic Services]
            GEO[Geodata Service OSM/Open-Meteo]
            AIS[AI Services chat, pricing, forecast...]
            PYS[Payment Service Mock / Razorpay]
            PDF[PDF Invoice Generator]
        end
    end

    subgraph Data [Data & Storage Services]
        DB[(MongoDB Database)]
        CLD[Cloudinary CDN]
        LCL[Local Disk Storage]
    end

    subgraph External [External Integrations]
        GEM[Google Gemini AI API]
        RP[Razorpay Payment API]
        OSM[OSM Nominatim / Overpass API]
        OM[Open-Meteo Weather API]
    end

    %% Client Interactions
    UI --> NXT
    SOCK_C <-->|WebSockets: Typing/Notifs| SOCK_S
    NXT -->|HTTP Requests| SVR
    
    %% Server Routing
    SVR --> RTR
    SVR --> SOCK_S
    RTR --> LMT
    LMT --> AUTH
    AUTH --> AC & LC & BC & AIC & PC
    
    %% Controllers to Services
    LC & AIC --> GEO
    AIC --> AIS
    BC & PC --> PYS
    PC --> PDF
    
    %% Services to Storage/Externals
    GEO -->|HTTP: Cache-Aside| OSM & OM
    GEO -->|Cache Read/Write| DB
    AIS -->|HTTP prompt| GEM
    AIS -->|Log Insights| DB
    PYS -->|Verify/Refund| RP
    PYS -->|Mock fallback| DB
    
    %% File handling
    LC -->|Fallback uploads| CLD & LCL
```

---

## 🛠️ Tech Stack

| Layer | Component | Technologies / Libraries |
| :--- | :--- | :--- |
| **Frontend** | Framework | Next.js 16 (App Router), React 19, TypeScript |
| | Styling | Tailwind CSS v4, Lucide Icons, Framer Motion |
| | Utilities | `socket.io-client`, `react-hot-toast`, `next-themes` |
| **Backend** | Server Engine | Node.js, Express.js, TypeScript |
| | WebSockets | `socket.io` (Real-time message routing & indicators) |
| | Validation | Zod (strict JSON body schema validation) |
| | Document Comp | `pdfkit` (server-side receipt compilation) |
| **Database** | Database Engine | MongoDB |
| | Object Modeling | Mongoose ODM |
| **Integrations** | AI Engine | Google Gemini API (`@google/generative-ai` model: `gemini-1.5-flash`) |
| | Maps & Location | OpenStreetMap Nominatim API (Geocoding), OSM Overpass API (Attractions) |
| | Weather Forecast | Open-Meteo Forecast API |
| | Payment Gateway | Razorpay API Integration, Webhook verified signatures |
| | CDN File Storage | Cloudinary Storage Engine, Multer |
| **Ops & DevOps** | Containerization | Docker, Docker Compose |
| | Health & Status | Custom health probes with exit alerts on DB dropouts |

---

## 🗃️ Database Architecture

StaySmart defines Mongoose schemas with clear relationships:

*   **User (`User`)**: Stores profile details, roles (`Guest`, `Host`, `PropertyManager`, `Admin`, `SuperAdmin`), encrypted bank credentials, payout tokens, default house rules, and IP device login session logs.
*   **Listing (`Listing`)**: Stores property details, price, address, GeoJSON coordinates `[lng, lat]` for geospatial search queries, amenities arrays, blackout intervals, host relations, and virtual tour panoramas.
*   **Booking (`Booking`)**: Manages guest reservations, dates, price breakdowns (taxes, commissions, cleaning fees, applied coupon codes), payment methods, order references, and state machine statuses (`Pending`, `Confirmed`, `Cancelled`, `PaymentFailed`, `Expired`, `PendingVerification`, `Completed`, `Refunded`).
*   **Review (`Review`)**: Ratings (1 to 5) and commentary with supporting attachment URLs. Indexed uniquely on `[listing, author]` to prevent duplicate critiques.
*   **Wishlist (`Wishlist`)**: Maps a single user to a list of listing references.
*   **GeodataCache (`GeodataCache`)**: Caches OpenStreetMap Nominatim lookups, Open-Meteo forecasts, and OSM Overpass attraction responses to avoid rate limits.
*   **Session (`Session`)**: Tracks active user session refresh tokens.
*   **BlacklistToken (`BlacklistToken`)**: Revoked access/refresh JWT signatures for secure logouts.
*   **CheckoutLock (`CheckoutLock`)**: Ephemeral lock documents holding reservation slots for 5 minutes during checking out to prevent double booking.
*   **Coupon (`Coupon`)**: Host-issued discount codes with value metrics, active flags, and expiry checks.
*   **MarketData (`PricingHistory`, `MarketData`)**: Historical records used by heuristic algorithms.

---

## 🔌 API Documentation

### 1. Authentication & Sessions (`/api/auth`)
*   `POST /signup` - Registers Guest/Host account credentials.
*   `POST /login` - Checks credentials; sets HTTP-only JWT cookies.
*   `POST /logout` - Revokes session signatures and clears cookies.
*   `POST /refresh` - Generates fresh access tokens using refresh token rotation.
*   `POST /google` - Login or Register utilizing Google OAuth credentials.
*   `POST /github` - Login or Register utilizing GitHub OAuth credentials.
*   `GET /me` - Returns profile details of the logged-in user.
*   `PATCH /profile` - Update profile bio, phone, languages, or default house rules.
*   `POST /forgot-password` - Dispatches password recovery tokens to specified emails.
*   `POST /reset-password` - Resets passwords using verified reset tokens.
*   `POST /update-password` - Update password while logged in.
*   `POST /send-otp` - Triggers registration or verification emails with verification codes.
*   `POST /verify-otp` - Validates verification codes.
*   `GET /sessions` - Lists active browser login histories.
*   `DELETE /sessions/:id` - Revokes single active sessions.
*   `DELETE /sessions` - Revokes all other active sessions (logout everywhere).
*   `POST /avatar` - Uploads profile avatar files (multipart files).
*   `DELETE /avatar` - Resets avatar references.
*   `POST /onboard-host` - Saves banking, tax, and GST parameters for payout processing.
*   `POST /sync-payment` - Updates payment profile checks.

### 2. Listings (`/api/listings`)
*   `GET /` - Retrieves listings (filters by city, coordinates distance, price, bedrooms, guests, amenities).
*   `POST /` - Publishes a new property listing (multipart photos + parameters).
*   `GET /:id` - Fetches specific listing details (integrates OSM nearby guides and weather stats).
*   `PUT /:id` - Modifies listing options (ownership checks).
*   `DELETE /:id` - Removes listings (ownership checks).

### 3. Bookings (`/api/bookings`)
*   `POST /` - Places date holds and checks conflicts (Guests only).
*   `GET /guest` - Displays active booking histories for Guests.
*   `GET /host` - Displays incoming reservations for Host properties.
*   `POST /:id/cancel` - Processes cancellations (handles refunds if active).

### 4. Payments & Checkout (`/api/payments`)
*   `POST /checkout` - Establishes lock files and issues Razorpay order details.
*   `POST /confirm` - Verifies Razorpay checkout signatures to confirm stays.
*   `POST /mock/confirm` - Confirms mock checkout order requests.
*   `POST /upi/checkout` - Submits manual UPI requests.
*   `POST /upi/confirm/:bookingId` - Confirms stays using manual UPI reference keys.
*   `POST /webhook` - Receives incoming Razorpay capture notifications.
*   `GET /invoice/:bookingId` - Retrieves JSON invoice configurations.
*   `GET /invoice/:bookingId/pdf` - Compiles and downloads formatted PDF receipt invoices.

### 5. AI Services (`/api/ai`)
*   `POST /search` - Processes semantic search queries.
*   `POST /chat` - Interfaces with the RAG travel concierge (Host or Guest contexts).
*   `GET /recommendations` - Personalizes stay recommendations based on history.
*   `POST /itinerary` - Requests itineraries via Gemini chat.
*   `GET /pricing/:listingId` - Forecasts dynamic nightly values (Host owners only).
*   `GET /forecast/:listingId` - Forecasts revenue models (Host owners only).
*   `GET /optimize/:listingId` - Analyzes SEO listing summaries (Host owners only).
*   `GET /reviews/:listingId` - Synthesizes sentiment pros/cons from reviews (Host owners only).

### 6. Admin Control (`/api/admin`)
*   `POST /approve-host/:hostId` - Approves onboarded host registration requests.
*   `POST /suspend-user/:userId` - Suspends active guest or host accounts.
*   `POST /listings/:listingId/moderate` - Moderates listings (Pending, Approved, Rejected).
*   `GET /feature-flags` - Lists active database feature configurations.
*   `POST /feature-flags` - Updates active system feature flags.
*   `GET /analytics` - Fetches platform revenue and listing statistics.
*   `GET /audit-logs` - Inspects user behavior audit histories.

---

## 💻 Local Development

### Prerequisites
*   **Node.js**: Version 20.x or higher
*   **MongoDB**: Local MongoDB instance or Dockerized service running on `mongodb://127.0.0.1:27017`

### 🔑 Environment Variables Setup

#### 1. Backend Environment Configuration (`backend/.env`)
Create a `.env` file under the `/backend` directory:
```env
# Server Network Parameters
PORT=8080
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Database Setup
MONGO_URL=mongodb://127.0.0.1:27017/staysmart

# JWT Token Configurations
JWT_ACCESS_SECRET=your_secure_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret_key_here
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Google Gemini AI Integration
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Cloudinary Storage Settings (Falls back to local disk storage in development if omitted)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here

# Payout Providers (MOCK or RAZORPAY)
PAYMENT_PROVIDER=MOCK
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here

# Transactional Mail (Falls back to printing details in console if omitted)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_username_here
SMTP_PASS=your_smtp_password_here
SMTP_FROM="StaySmart Vacation Rentals" <noreply@staysmart.com>
```

#### 2. Frontend Environment Configuration (`frontend/.env`)
Create a `.env` file under the `/frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
```

---

### Command Guide

#### 1. Setup & Seeding
Install dependencies and verify the database connection:
```bash
# Set up backend
cd backend
npm install
npm run seed
```
> [!NOTE]
> `npm run seed` connects to MongoDB to verify connection strings. In alignment with database integrity, it does not inject dummy accounts or duplicate listings. These are created dynamically during application use.

To clean up or purge test data during local development:
```bash
# Clear all application collections from the local database
npm run db:reset

# Purge mock bookings and generated assets
npm run purge:demo
```

#### 2. Running Services Locally
Start the backend Express server:
```bash
# Start backend (auto-compiles and restarts on edits)
cd backend
npm run dev
```
The backend service binds to `http://localhost:8080`. You can inspect the interactive API spec by opening `http://localhost:8080/api-docs`.

Start the Next.js React client:
```bash
# Start frontend Next.js server
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:3000` to browse, book, or host on StaySmart!

---

### 🐳 Docker Compose Deployment
To compile and start the Next.js web client, Express API server, and MongoDB container automatically:
```bash
# Build and run Docker containers
docker compose up --build
```
This builds and binds the services:
*   **Web Portal**: `http://localhost:3000`
*   **REST Server**: `http://localhost:8080`
*   **MongoDB**: `localhost:27017`

---

## 🔒 Security Features
StaySmart prioritizes system security and customer information privacy:
1.  **Authentication Security**: JWT Access + Refresh token rotations. Access tokens are kept short-lived (15 minutes), and revoked tokens are blacklisted.
2.  **Resource-Level Guards**: Middleware validates that listing updates, bookings, invoices, and review deletions are executed exclusively by the resource owner or an administrator.
3.  **Authentication Rate Limiter**: Core paths are guarded against brute-force attacks via `express-rate-limit`. Tighter limits are applied to auth and Gemini query routes to manage API costs.
4.  **No-Exposure Configs**: All system access keys, Gemini endpoints, Cloudinary configurations, and database credentials remain hidden behind `.env` boundaries.
5.  **Double-Booking Locks**: A 5-minute database locking mechanism is used on checkout initialization to prevent concurrent bookings for the same date ranges.

---

## 🗺️ Future Roadmap
The following features are planned for future releases:
*   **Stripe Checkout Integration**: Adding alternative gateway options for international customers.
*   **Comprehensive Analytical Charts**: Advanced metrics for host occupancy, monthly revenues, and seasonal listing trends.
*   **Push Notifications**: Replacing email notices with direct web app notifications using Socket.io or Web Push.
*   **Interactive Virtual Tour Designer**: An interface for hosts to map panoramas and place navigation hotspots manually.

---

## ✍️ Author
*   **Gumma Avinash**
*   Computer Science & Engineering
*   Indian Institute of Technology Patna (IIT Patna)
*   **GitHub**: [https://github.com/avinashr925](https://github.com/avinashr925)
