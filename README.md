# Hasnain Digital Marketer — Full-Stack Portfolio & AI Platform

> Production-ready full-stack portfolio for **Hasnain Digital Marketer** — Web Developer, Python Developer, UI/UX Designer, and SEO & Digital Marketing Specialist.

---

## 🌟 Overview & Architecture

- **Frontend**: Clean, high-performance HTML5, CSS3 (Modern responsive styling & glassmorphism), and Vanilla JavaScript (SPA navigation, real-time validation, interactive modals, AI assistant drawer).
- **Backend**: Node.js & Express.js REST API with rate limiting, XSS escaping, duplicate submission protection, and security headers.
- **Serverless Ready**: Native handlers in `/api` for zero-configuration deployment on Vercel, Netlify, or serverless providers.
- **AI Assistant ("Hasnain's Assistant")**: Intelligent multilingual client discovery agent supporting Google Gemini REST API, OpenAI REST API, and a built-in offline semantic rule engine. Includes automatic private lead qualification alerts.
- **Email Engine**: Production mailer supporting Resend API (HTTP) and standard SMTP (Nodemailer) with inline branded email templates.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate your environment variables (see [Environment Variables](#-environment-variables) below).

### 3. Run Tests
```bash
npm test
```

### 4. Start Local Server
```bash
npm start
```
Open `http://localhost:3000` in your browser.

---

## 🔐 Environment Variables

| Variable | Description | Secret? | Default / Example |
|---|---|---|---|
| `PORT` | Local server port | No | `3000` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | No | `production` |
| `CONTACT_EMAIL` | Target email for contact submissions and AI lead notifications | No | `muhammadhasnayn007@gmail.com` |
| `SITE_URL` | Canonical URL of the production website | No | `https://hasnaindigitalmarketer.com` |
| `AVAILABILITY_STATUS` | Real-time availability indicator | No | `"Available for Projects"` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated or `*`) | No | `https://hasnaindigitalmarketer.com` |
| `RESEND_API_KEY` | Resend API key for outbound transactional emails | **YES** | `re_...` |
| `RESEND_FROM` | Verified sender address in Resend dashboard | No | `Hasnain Digital Marketer <onboarding@resend.dev>` |
| `SMTP_HOST` | Standard SMTP server host (Alternative to Resend) | No | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (465 for SSL, 587 for TLS) | No | `465` |
| `SMTP_SECURE` | Use SSL/TLS for SMTP | No | `true` |
| `SMTP_USER` | SMTP username / email address | **YES** | `your_email@gmail.com` |
| `SMTP_PASS` | SMTP application password | **YES** | `your_16_char_password` |
| `GEMINI_API_KEY` | Google Gemini API key for AI Assistant | **YES** | `AIza...` |
| `GEMINI_MODEL` | Gemini model identifier | No | `gemini-1.5-flash` |
| `OPENAI_API_KEY` | OpenAI API key (Alternative to Gemini) | **YES** | `sk-...` |
| `OPENAI_MODEL` | OpenAI model identifier | No | `gpt-4o-mini` |
| `RATE_LIMIT_CONTACT` | Max contact form submissions per IP / minute | No | `5` |
| `RATE_LIMIT_CHAT` | Max chat queries per IP / minute | No | `20` |

> **IMPORTANT**: Never commit your `.env` file to GitHub or any public version control.

---

## 🌐 Production Deployment Guide

### Option A: Render / Railway / VPS (Node.js Express Server)
1. Link your GitHub repository in your dashboard.
2. Set Build Command: `npm install`
3. Set Start Command: `node server.js`
4. In Environment Variables settings, configure all production keys (e.g. `RESEND_API_KEY`, `GEMINI_API_KEY`, `SITE_URL`).

### Option B: Vercel / Netlify (Serverless Architecture)
1. Import repository into Vercel / Netlify.
2. Root directory: `./`
3. Framework Preset: `Other`
4. The serverless functions under `/api/` (`contact.js`, `chat.js`, `health.js`) will execute automatically on edge/serverless runtimes.
5. Configure Environment Variables in the project settings dashboard.

---

## 🧪 Testing

The codebase includes comprehensive automated tests for all backend logic, email formatting, AI assistant handlers, rate limiting, and security sanitization:

```bash
# Run unit & security tests
node test/api-test.js

# Run full server integration & E2E tests
node test/server-test.js
```

---

## 🛡️ Security Best Practices

- All HTML inputs are escaped to prevent XSS.
- Rate limiting is enforced on both contact form and AI chatbot endpoints.
- Honeypot protection silently traps automated spambots.
- In-memory duplicate submission hashing prevents accidental duplicate form submissions.
- All secrets are isolated strictly in environment variables.

---

## 📄 License

MIT © [Hasnain Digital Marketer](https://hasnaindigitalmarketer.com/)
