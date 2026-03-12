# Activity Guide: Migrating a Role-Based SPA to a Full-Stack App with Node.js & Express.js

> **Prerequisite:** Students must have completed the "Full-Stack Web App: Build-From-Scratch Activity Guide – Implementing a Role-Based SPA Using Only Frontend Tech" (which uses localStorage for auth and role management).

---

## Learning Objectives

By completing this activity, students will be able to:

- Replace localStorage with a real session-based or token-based authentication system.
- Create a Node.js/Express backend that handles user registration, login, and role-based access.
- Connect the existing frontend to the new backend via fetch API calls.
- Implement protected routes on both frontend and backend.
- Understand the difference between client-side and server-side role enforcement.

---

## 🧩 Overview of Changes

| Feature | Frontend-Only Version | Full-Stack Version |
|---|---|---|
| User Data Storage | localStorage | MySQL (or in-memory for simplicity) |
| Authentication | Fake login (no real validation) | Real login with password hashing |
| Authorization | Client-side role checks | Server enforces role-based access |
| Data Persistence | Lost on browser clear | Persists across sessions |
| Security | None (roles can be edited in DevTools) | Roles stored securely on server |

> For simplicity in this activity, we'll use an in-memory user store (not a database), but the structure is ready for MySQL later.

---

## Part 1: Set Up the Backend Project

### Step 1: Create a New Backend Folder

```bash
mkdir role-based-app-backend
cd role-based-app-backend
npm init -y
npm install express bcryptjs jsonwebtoken cors
npm install --save-dev nodemon
```

**Packages:**
- `bcryptjs` — to hash passwords
- `jsonwebtoken` — for token-based auth (optional; you can use sessions too)
- `cors` — to allow frontend (on `localhost:5500` or similar) to talk to backend (`localhost:3000`)

### Step 2: Update `package.json`

Add a start script:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
},
```

---

## 🖥 Part 2: Build the Express Server (`server.js`)

```js
// server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret'; // In production, use environment variables!

// Enable CORS for frontend (e.g., Live Server on port 5500)
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'] // Adjust based on your frontend URL
}));

// Middleware to parse JSON
app.use(express.json());

// 🔒 In-memory "database" (replace with MongoDB later)
let users = [
  { id: 1, username: 'admin', password: '$2a$10$...', role: 'admin' }, // pre-hashed
  { id: 2, username: 'alice', password: '$2a$10$...', role: 'user' }
];

// Helper: Hash password (run once to generate hashes)
// console.log(bcrypt.hashSync('admin123', 10)); // Use this to generate real hashes

// Pre-hash known passwords for demo
if (!users[0].password.includes('$2a$')) {
  users[0].password = bcrypt.hashSync('admin123', 10);
  users[1].password = bcrypt.hashSync('user123', 10);
}

// 🔑 AUTH ROUTES

// POST /api/register
app.post('/api/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Check if user exists
  const existing = users.find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    username,
    password: hashedPassword,
    role // Note: In real apps, role should NOT be set by client!
  };

  users.push(newUser);
  res.status(201).json({ message: 'User registered', username, role });
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  res.json({ token, user: { username: user.username, role: user.role } });
});

// 👤 PROTECTED ROUTE: Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 🛡 ROLE-BASED PROTECTED ROUTE: Admin-only
app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({ message: 'Welcome to admin dashboard!', data: 'Secret admin info' });
});

// 🌐 PUBLIC ROUTE: Guest content
app.get('/api/content/guest', (req, res) => {
  res.json({ message: 'Public content for all visitors' });
});

// ⚙️ MIDDLEWARE

// Token authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Role authorization
function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
}

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`👤 Try logging in with:`);
  console.log(`   - Admin: username=admin, password=admin123`);
  console.log(`   - User:  username=alice, password=user123`);
});
```

---

## 💻 Part 3: Update the Frontend SPA

Keep your existing HTML/CSS/JS files. Only modify the JavaScript logic to call the backend.

### Step 1: Replace `localStorage` Logic

In your main JS file (e.g., `app.js`):

❌ **Remove:**

```js
// Old localStorage login
localStorage.setItem('user', JSON.stringify({ username, role }));
```

✅ **Add: Login with API**

```js
async function login(username, password) {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Save token in memory (or sessionStorage for page refresh)
      sessionStorage.setItem('authToken', data.token);
      showDashboard(data.user);
    } else {
      alert('Login failed: ' + data.error);
    }
  } catch (err) {
    alert('Network error');
  }
}
```

### Step 2: Add Auth Header to Protected Requests

```js
function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Example: Fetch admin data
async function loadAdminDashboard() {
  const res = await fetch('http://localhost:3000/api/admin/dashboard', {
    headers: getAuthHeader()
  });
  if (res.ok) {
    const data = await res.json();
    document.getElementById('content').innerText = data.message;
  } else {
    document.getElementById('content').innerText = 'Access denied!';
  }
}
```

### Step 3: Update UI Based on Role

- On page load, check if `sessionStorage.authToken` exists.
- Decode the token (or call `/api/profile`) to get the user role.
- Show/hide buttons (e.g., hide "Admin Dashboard" if not admin).

> ⚠️ **Important:** Never trust the frontend! The backend must always enforce role checks.

---

## Part 4: Testing the Full-Stack App

1. **Start the backend:**

```bash
npm run dev
```

2. Open your frontend in Live Server (e.g., VS Code Live Server on port 5500).

3. **Test flows:**
   - Register a new user
   - Log in as `admin` → access admin dashboard
   - Log in as `user` → see user content, but blocked from admin route
   - Clear `sessionStorage` → user is logged out

4. **Verify security:**
   - Try changing role in DevTools → still blocked by backend
   - Try accessing `/api/admin/dashboard` without token → 401 error

---

## 🧠 Key Concepts Reinforced

| Concept | Why It Matters |
|---|---|
| Server-side auth | Prevents clients from faking roles |
| JWT tokens | Secure way to transmit user identity |
| CORS | Allows controlled cross-origin requests |
| Middleware | Reusable logic for auth and roles |
| Separation of concerns | Frontend = UI, Backend = logic & security |

---

## Extension Ideas (Optional Challenges)

1. Add MySQL to persist users permanently.
2. Implement logout (clear `sessionStorage` + add token blacklist).
3. Add password reset flow.

---

## Deliverables

- `server.js` (backend code)
- Updated frontend JS file(s)
- GitHub repository named `role-based-app-backend`
- Include screenshots in documentation showing:
  - Successful login
  - Admin accessing admin route
  - Regular user being denied admin access
