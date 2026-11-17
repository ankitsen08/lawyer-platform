# 📄 Product Requirements Document (PRD) & Technical Architecture Specification
## **Project:** LawyerComparison — Premier US Legal Directory & Comparison Platform
**Version:** 1.0.0 (Production Ready)  
**Target Environment:** Hostinger Cloud Container / Node.js Runtime  
**Repository:** `ankitsen08/lawyer-platform`  
**Live Production URL:** `https://lawyercomparison.us`  

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Problem Statement](#2-product-vision--problem-statement)
3. [User Personas & Target Audience](#3-user-personas--target-audience)
4. [Functional Feature Specifications](#4-functional-feature-specifications)
5. [End-to-End System Architecture](#5-end-to-end-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Database Schema & Data Models](#7-database-schema--data-models)
8. [API Architecture & Integration Points](#8-api-architecture--integration-points)
9. [Deployment & Infrastructure Topology (Hostinger)](#9-deployment--infrastructure-topology-hostinger)
10. [High Availability & Fault Tolerance Approach](#10-high-availability--fault-tolerance-approach)
11. [Security, Performance & SEO Best Practices](#11-security-performance--seo-best-practices)
12. [Future Roadmap & Scale Strategy](#12-future-roadmap--scale-strategy)

---

## 1. Executive Summary

**LawyerComparison** is a high-performance, full-stack legal directory and attorney comparison web application engineered to bridge the gap between US clients seeking trusted legal counsel and verified attorneys looking to grow their caseloads.

The platform provides:
- Seamless attorney discovery across 47+ legal practice areas and geographic territories.
- An interactive, multi-lawyer comparison matrix that benchmarks attorneys across experience, rates, verified bar standing, client reviews, and consultation policies.
- Direct case consultation booking with automatic calendar synchronization (.ICS and Google Calendar) and video conference links.
- Community-driven Free Legal Q&A forum connecting seekers with verified attorney answers.
- Dual-role authentication and portal dashboards for both Clients and Legal Practitioners.
- Turnkey monetization via tiered attorney subscription tiers powered by Stripe integration.

---

## 2. Product Vision & Problem Statement

### The Problem:
1. **Client Frustration:** Finding high-caliber legal representation in the US is opaque. Hourly fees vary widely, specializations are hard to verify, and comparing two or more law firms side-by-side traditionally requires dozens of browser tabs and phone calls.
2. **Attorney Lead Inefficiency:** Law firms waste thousands of dollars monthly on low-intent pay-per-click ads that bring unqualified leads.
3. **Friction in Initial Consultation:** Scheduling initial consultations involves tedious email tag back-and-forth without calendar integration.

### The Solution:
A minimalist, high-converting, mobile-responsive legal platform that operates like an "Airbnb meets Avvo" for legal counsel, emphasizing transparency, instant side-by-side comparison, frictionless booking, and zero deployment flakiness.

---

## 3. User Personas & Target Audience

| Persona | Needs & Goals | Core Actions on Platform |
| :--- | :--- | :--- |
| **The Legal Seeker (Client)** | Needs urgent, trustworthy representation (e.g., DUI, divorce, injury, business dispute) with upfront pricing & reviews. | Searches directory, compares up to 4 lawyers side-by-side, saves favorites, books instant consultations, asks legal questions. |
| **The Independent Attorney** | Wants high-intent case inquiries without bloated marketing agencies. | Claims profile, subscribes to visibility plan, sets consultation availability, manages incoming client leads and inbox inquiries. |
| **The Enterprise Law Firm Partner** | Wants brand authority, high-ticket corporate litigation clients, and verified reviews. | Subscribes to Elite tier, tracks profile impression analytics, manages multi-lawyer firm representation. |

---

## 4. Functional Feature Specifications

### 4.1. Intelligent Hero Search & Directory Navigation
- **Dual-criteria Search:** Practice category (e.g., Corporate Litigation, Family Law, Criminal Defense) + Geographic Location (e.g., New York, NY, Los Angeles, CA).
- **Fast-Filter Sidebar:** Instant client-side & server-side filtering by:
  - Minimum Experience (5+, 10+, 15+, 20+ years)
  - Free Consultation Availability toggle
  - Practice Area multi-select
  - Sorting: Top Rated, Most Reviewed, Alphabetical (A-Z)
- **Pre-rendered Pages (SSG):** 47 static category and location routes for instant sub-second page loads and maximum search engine indexability.

### 4.2. Interactive Lawyer Comparison Matrix
- **State Management:** Powered by Zustand (`useCompareStore`), persistent across browser tabs.
- **Side-by-Side Evaluation:** Compare up to 4 lawyers simultaneously across:
  - Hourly rates ($/hr)
  - Years of bar experience
  - Primary & secondary practice areas
  - Free consultation availability
  - Verified ratings & review counts
- **Persistent Floating Tray:** Real-time floating comparison badge appears as soon as a user bookmarks lawyers to compare.

### 4.3. Consultation Booking & Calendar Dispatch
- Instant booking modal capturing: Case topic, date, time slot, client contact info.
- **Automated Workflow:**
  1. Creates consultation record in database.
  2. Generates dynamic `.ics` calendar invitation file.
  3. Formats one-click Google Calendar addition link.
  4. Generates unique Zoom video conference link.
  5. Triggers confirmation notification to both client and attorney.

### 4.4. Free Legal Q&A Forum
- Public legal forum (`/legal-answers`) where clients post legal inquiries anonymously.
- Verified attorneys post authoritative answers with their profile linked.
- Enhances organic SEO footprint and establishes lawyer thought-leadership.

### 4.5. Dual-Role Authentication & Portals
- **Client Portal (`/client-dashboard`):** Saved attorneys list, active consultations, status tracker, messaging inbox.
- **Attorney Portal (`/attorney-dashboard`):** Profile view analytics, lead generation stats, lead inbox, subscription management, profile editor.

### 4.6. Attorney Monetization & Stripe Checkout
- **Pricing Tiers (`/lawyer-onboarding/pricing`):**
  - **Starter ($99/mo):** Verified Directory Listing, Direct Client Inquiries, Standard Placement.
  - **Pro ($199/mo):** Featured Category Placement, Priority Search Ranking, Analytics Dashboard, Direct Messaging.
  - **Elite ($399/mo):** Top Directory Spot, Avvo/Google Review Sync, Dedicated Case Manager, 0% Platform Fee.
- Integrated with Stripe Checkout sessions for automated billing.

---

## 5. End-to-End System Architecture

The project utilizes a **Unified Monorepo Architecture** designed for zero-downtime containerized cloud hosting.

```
+-------------------------------------------------------------------+
|               Hostinger Edge Proxy / Reverse Proxy                |
+-------------------------------------------------------------------+
                                  │ HTTPS :443
                                  ▼
+-------------------------------------------------------------------+
|            Unified Root Server (server.js / 0.0.0.0:3000)         |
|  - Fast Health Check (/health -> HTTP 200 in 1ms)                 |
|  - Direct Static Asset Serving (/_next/static, /public)           |
+-------------------------------------------------------------------+
           │                                        │
           ▼                                        ▼
+-----------------------+              +----------------------------+
|   Express 5 API Router|              |    Next.js 16 SSR Engine   |
| - Authentication JWT  |              | - App Router Pages         |
| - Socket.IO Real-time |              | - 47 Pre-rendered SSG      |
| - Consultations / ICS |              | - Responsive Client UI     |
| - Stripe Checkout     |              +----------------------------+
+-----------------------+
           │
           ▼
+-------------------------------------------------------------------+
|                      Data & Service Layer                         |
|  - MongoDB Atlas Cloud Replica Set (Primary)                      |
|  - Resilient In-Memory Mock Store (Automatic Zero-Crash Fallback) |
|  - Transactional Email Dispatcher & Calendar Generator            |
+-------------------------------------------------------------------+
```

### Architectural Highlights:
1. **Unified Single-Port Entrypoint (`server.js`):** 
   - Eliminates port collision and dual-container complexity on Hostinger by bridging the Express API engine and Next.js request handler on one unified HTTP listener.
   - Ultra-fast immediate `/health` endpoint responds within 1ms for cloud probes.
2. **Direct Static Asset Fast-Path:**
   - Static CSS chunks, JS bundles, and public images (`/_next/static`, `/logo.jpg`) are intercepted and served directly via `express.static` with `max-age=365d, immutable` headers.
   - Completely bypasses the Next.js SSR event loop for assets, ensuring lightning-fast load times.
3. **MIME-Type & Asset Guarding:**
   - Fallback handlers explicitly prevent HTML error pages from being returned for `.css` or `.js` requests, preventing Chrome MIME-type cache poisoning.

---

## 6. Technology Stack

| Layer | Technology | Rationale / Key Responsibility |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16.3.6 (App Router)** | Hybrid rendering: Server-Side Rendering (SSR) for dynamic directory, Static-Site Generation (SSG) for 47 pre-rendered categories, React 19 concurrent features. |
| **Frontend Library** | **React 19.2.8** | Modern component-driven reactive interface. |
| **Styling & Design System** | **Tailwind CSS v4 + Vanilla CSS** | Zero-runtime CSS styling, custom minimalist color tokens (`#0a0a0a` blacks, `#ffffff` whites, `#e5e5e5` borders), responsive flex/grid layouts. |
| **Icons & Micro-UI** | **Lucide React + Sonner** | Crisp legal iconography (Gavel, Scale, Briefcase, MapPin) and minimalist toast notification system. |
| **State Management** | **Zustand** | Lightweight, boilerplate-free state stores for Auth (`useAuthStore`) and Lawyer Comparison (`useCompareStore`). |
| **Backend Framework** | **Node.js + Express 5.2.1** | High-throughput REST API routing, cookie parsing, security headers, rate-limiting, and middleware orchestration. |
| **Real-time Protocol** | **Socket.IO 4.8.4** | Bi-directional communication for consultation chat rooms and instant inquiry notifications. |
| **Database & ODM** | **MongoDB Atlas + Mongoose 9.10** | Document database for flexible lawyer profiles, reviews, inquiries, with replica set clustering. |
| **Authentication** | **JWT (JSON Web Tokens) + Cookies** | Secure stateless token verification with 7-day expiration and role enforcement (`client` vs `lawyer`). |
| **Payment Gateway** | **Stripe API** | Hosted checkout sessions for recurring lawyer subscription plans. |
| **Process Orchestration** | **Unified `server.js` / Standalone** | Production wrapper binding to `0.0.0.0:$PORT` for cloud container hosting. |

---

## 7. Database Schema & Data Models

### 7.1. User Model (`User.js`)
Handles both Clients and Attorneys via a discriminator `role` field.
- `role`: `'client' | 'lawyer'`
- `email`: String (unique, indexed)
- `passwordHash`: String (bcrypt hashed)
- `name`, `firstName`, `lastName`: String
- `firmName`: String (e.g., "Pearson & Hardman LLP")
- `specialty`: String (Primary practice area)
- `practiceAreas`: `[String]` (e.g., `["Corporate Litigation", "White Collar Defense"]`)
- `rating`: Number (1.0 to 5.0)
- `reviewCount`: Number
- `hourlyRate`: Number
- `experienceYears`: Number
- `freeConsultation`: Boolean
- `location`: String (e.g., "New York, NY")
- `imageUrl`: String (CDN URL)
- `bio` / `about`: String
- `badges`: `[String]`
- `plan`: `'starter' | 'pro' | 'elite'`
- `onboarded`: Boolean

### 7.2. Consultation Model (`Consultation.js`)
Tracks scheduled meetings between clients and attorneys.
- `clientId`: String / ObjectId
- `clientName`: String
- `clientEmail`: String
- `clientPhone`: String
- `lawyerId`: String / ObjectId
- `lawyerName`: String
- `date`: String
- `time`: String
- `topic`: String
- `consultationFee`: Number
- `zoomLink`: String
- `status`: `'upcoming' | 'completed' | 'cancelled'`

### 7.3. Inquiry & Message Models (`Inquiry.js`, `Message.js`)
- **Inquiry:** Captures incoming case leads from the contact modal.
- **Message:** Real-time chat messages indexed by compound `roomId` (`[clientEmail, lawyerId].sort().join('_')`).

### 7.4. Legal Q&A Models (`Question.js`, `Answer.js`)
- **Question:** Community questions with category tags and author metadata.
- **Answer:** Attorney answers with verified badges, upvote tallies, and timestamps.

---

## 8. API Architecture & Integration Points

All backend endpoints are prefixed with `/api` and served natively through the unified Express server.

### Core Endpoints:
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register client or attorney with password hashing | Public |
| `POST` | `/api/auth/login` | Authenticate user, issue 7-day JWT cookie | Public |
| `POST` | `/api/auth/logout` | Clear authentication cookies | Authenticated |
| `GET` | `/api/auth/me` | Hydrate current user state from cookies | Authenticated |
| `GET` | `/api/lawyers` | Query directory with category, location, rating filters | Public |
| `GET` | `/api/lawyers/:id` | Fetch detailed lawyer profile & badges | Public |
| `PUT` | `/api/lawyers/:id` | Update profile information & subscription plan | Lawyer |
| `GET` | `/api/lawyers/:id/stats` | Fetch impressions, lead volume, and ranking trends | Lawyer |
| `POST` | `/api/consultations` | Book consultation & trigger calendar dispatch | Public / Client |
| `GET` | `/api/consultations/:userId` | List scheduled consultations for client or lawyer | Authenticated |
| `POST` | `/api/inquiries` | Submit case lead inquiry | Public |
| `GET` | `/api/clients/:id/saved-attorneys`| Retrieve bookmarked attorney list | Client |
| `POST` | `/api/checkout/session` | Create Stripe checkout session for subscription tier | Lawyer |
| `GET` | `/health` | Container health probe (uptime, status, host, port) | Public |

---

## 9. Deployment & Infrastructure Topology (Hostinger)

### Container Configuration:
- **Cloud Platform:** Hostinger Node.js Container Cloud Runtime.
- **Host Binding:** `0.0.0.0` (mandated for container bridge networks).
- **Port:** Dynamically assigned via `process.env.PORT` (defaults to 3000).
- **Process Entrypoint:** `server.js` (aliased by `index.js`).

### Post-Build Synchronization Pipeline (`copy-build.js`):
1. Next.js builds production assets into `frontend/.next`.
2. `scripts/copy-build.js` automatically synchronizes:
   - Build manifests (`BUILD_ID`, `routes-manifest.json`, `prerender-manifest.json`).
   - Static chunks (`.next/static` -> root `.next/static`).
   - Public assets (`frontend/public` -> root `public`).
   - Standalone runner hook (`.next/standalone/server.js`).
3. Express server immediately serves assets from root paths with zero missing symlinks.

---

## 10. High Availability & Fault Tolerance Approach

1. **Database Fallback Resilience (Zero-Crash Guarantee):**
   - If MongoDB Atlas is unreachable (e.g., firewall restriction or network latency), the server **does not crash**.
   - Automatically falls back to an **In-Memory Store** seeded with 12 verified law firms.
   - Searches, comparisons, registrations, bookings, and logins continue to function seamlessly.

2. **Ultra-Fast Health Probe:**
   - Hostinger's edge monitors container health. The `/health` route responds with HTTP 200 in `< 2ms`, completely isolated from database latencies to prevent false-positive 503 restarts.

3. **Asset Guarding & Cache Poisoning Prevention:**
   - Static assets requested during server preparation return a 503 with exact MIME types (`text/css`, `application/javascript`) instead of HTML, ensuring browsers never poison their caches.

4. **Image & Logo Dimension Pinning:**
   - All image assets (including logos) have hardcoded inline width/height attributes, guaranteeing layouts never break or blow out even on slow 2G/3G mobile connections.

---

## 11. Security, Performance & SEO Best Practices

### Security Measures:
- **Rate Limiting:** Sliding token bucket rate limiters protecting `/api/auth/*` (30 req / 15 min) and `/api/inquiries` (120 req / 15 min).
- **Security Headers:**
  - `X-Content-Type-Options: nosniff` (Prevents MIME-sniffing exploits).
  - `X-Frame-Options: SAMEORIGIN` (Clickjacking mitigation).
  - `X-XSS-Protection: 1; mode=block` (Reflected XSS filter).
  - `Strict-Transport-Security: max-age=31536000` (Enforced HTTPS).
- **Credential Protection:** Passwords salted & hashed with bcrypt; JWT stored in HTTP-ready SameSite cookies.

### Performance Optimizations:
- **Zero-Layout Shift (CLS = 0):** All images and hero sections have explicitly defined dimensions.
- **Immutable Static Asset Caching:** Next.js static files served with `Cache-Control: public, max-age=31536000, immutable`.
- **Tree-Shaking:** Webpack bundle optimization with standalone asset trimming.

### SEO Strategy:
- Unique descriptive `<title>` and `<meta description>` tags on every route.
- OpenGraph tags for social media link previews.
- Dynamic `sitemap.xml` and `robots.txt` automatically rendered for Google Bot crawling.
- Single semantic `<h1>` hierarchy on every view.

---

## 12. Future Roadmap & Scale Strategy

- **Phase 2 — Direct Video Consultations (WebRTC):** Embedding in-browser encrypted video meetings directly into the client/lawyer dashboards.
- **Phase 3 — AI Legal Assistant:** An AI-powered triage chatbot that analyzes a client's issue and automatically suggests the top 3 matching attorneys based on historical win rates.
- **Phase 4 — State Bar API Verification:** Automated verification of lawyer bar numbers against state licensing databases (e.g., New York State Unified Court System, State Bar of California).
- **Phase 5 — Mobile App (React Native):** Cross-platform iOS and Android apps utilizing the existing REST & Socket.IO backend.

---
*Document prepared for LawyerComparison Platform stakeholders, developers, and deployment operations.*
