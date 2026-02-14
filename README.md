# 📘 Employee of the Month – Full Stack Application

A full‑stack system for collecting monthly employee reflections, adjudicating nominees, and producing final results for recognition ceremonies.  
Built with:

- **Node.js + Express** (backend)
- **MySQL** (database)
- **React + Vite** (frontend)
- **TypeScript** (everywhere)
- **Express‑Session** (authentication)
- **TailwindCSS** (UI styling)

This project is designed for reliability, clarity, and long‑term maintainability — with strict backend validation, role‑based access, and a clean workflow for employees, adjudicators, and admins.

---

## 🚀 Features

### 👤 Employee Portal
- Secure login  
- Submit monthly reflections  
- Prevent duplicate submissions  
- Auto‑detect logged‑in employee  
- Clean, guided UI  

### 🏅 Adjudication Panel
- View all candidates  
- See reflection summaries  
- Cast a single vote  
- Backend‑enforced rules  
- Tie detection  
- Suggested winner logic  

### 🛠 Admin Console
- Manage employees  
- Manage adjudicators  
- View all reflections  
- View all votes  
- Finalize winners  

### 🔐 Authentication
- Email + password login  
- Session‑based auth  
- Role detection (`Employee`, `Adjudicator`, `Admin`)  
- Protected routes  

---

## 📂 Project Structure

```
employee-of-the-month/
│
├── eom-backend/          # Express + MySQL backend
│   ├── src/
│   │   ├── routes/       # All API endpoints
│   │   ├── utils/        # Auth helpers, DB wrapper
│   │   ├── types/        # TypeScript augmentations
│   │   └── db.ts         # MySQL pool
│   ├── package.json
│   └── tsconfig.json
│
└── eom-frontend/         # React + Vite frontend
    ├── src/
    │   ├── pages/        # Reflections, Adjudication, Admin
    │   ├── utils/        # Frontend auth helpers
    │   └── components/
    ├── package.json
    └── vite.config.ts
```

---

## 🛠 Backend Setup

### 1. Install dependencies

```bash
cd eom-backend
npm install
```

### 2. Create `.env`

```
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=employee_of_the_month
SESSION_SECRET=your-secret-key
```

### 3. Start the backend

```bash
npm run dev
```

Backend runs at:

```
http://localhost:3000
```

---

## 🎨 Frontend Setup

### 1. Install dependencies

```bash
cd eom-frontend
npm install
```

### 2. Start the frontend

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 🗄 Database Schema (MySQL)

### `employees`
```
id (PK)
name
email
password_hash
is_admin
is_adjudicator
```

### `reflections`
```
id (PK)
employee_id (FK)
month
year
reflection_text
created_at
```

### `votes`
```
id (PK)
adjudicator_id (FK)
employee_id (FK)
month
year
motivation
created_at
```

---

## 🔐 Authentication Flow

1. User logs in → `/auth/login`
2. Backend stores:
   ```
   req.session.employee_id = user.id
   ```
3. Frontend calls `/auth/me` to load identity
4. Role‑based navigation is shown
5. Logout clears the session

---

## 🧪 Testing Endpoints (optional)

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"1234"}' \
  -c cookies.txt
```

### Get current user
```bash
curl http://localhost:3000/auth/me -b cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:3000/auth/logout -b cookies.txt
```

---

## 🛡 Safeguards & Best Practices

- `.gitignore` prevents secrets from leaking  
- `.env` is never committed  
- `backup/stable` branch is your restore point  
- TypeScript strict mode ensures safety  
- Backend enforces all business rules  
- GitHub repo protects your work  

---

## 📌 Roadmap

- Add ceremony export (PDF or HTML)
- Add analytics dashboard
- Add email notifications
- Add multi‑month history view

---

## 📄 License

Internal project — not licensed for public distribution.