# Testing Guide: Full-Stack Role-Based App

This guide walks you through testing the full-stack app after connecting the frontend to the Express.js backend.

---

## Prerequisites

- **Node.js** installed (v14 or higher)
- **VS Code** with the **Live Server** extension installed
- Backend dependencies installed (see Step 1)

---

## Step 1: Install Backend Dependencies

Open a terminal, navigate to the `backend` folder, and install packages:

```bash
cd backend
npm install
```

This installs: `express`, `bcryptjs`, `jsonwebtoken`, `cors`, and `nodemon`.

---

## Step 2: Start the Backend Server

From the `backend` folder, run:

```bash
npm run dev
```

You should see:

```
Backend running on http://localhost:3000
Try logging in with:
  - Admin: email=admin@example.com, password=Password123!
  - User:  email=alice@example.com, password=user123
```

> **Note:** `npm run dev` uses `nodemon` which auto-restarts the server when you save changes to `server.js`.

---

## Step 3: Start the Frontend

1. Open the `frontend` folder in VS Code.
2. Right-click on `index.html` and select **"Open with Live Server"**.
3. Your browser should open at `http://127.0.0.1:5500` (or `http://localhost:5500`).

> **Important:** The backend CORS is configured to allow requests from `http://127.0.0.1:5500` and `http://localhost:5500`. If Live Server uses a different port, update the `origin` array in `backend/server.js`.

---

## Step 4: Test the App Flows

### A. Test Registration

1. Click **"Register"** in the navbar (or click "Get Started" on the home page).
2. Fill in the form:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john@example.com`
   - Password: `test123`
3. Click **"Register"**.
4. **Expected:** A success toast appears and you are redirected to the **Verify Email** page.

### B. Test Email Verification

1. On the Verify Email page, you should see the email you just registered.
2. Click **"Simulate Email Verification"**.
3. **Expected:** A success toast appears and you are redirected to the **Login** page.

### C. Test Login (Regular User)

1. On the Login page, enter:
   - Email: `john@example.com`
   - Password: `test123`
2. Click **"Login"**.
3. **Expected:** A welcome toast appears, you are redirected to the **Profile** page, and the navbar shows your name.

### D. Test Login (Admin)

1. Log out first (click your name in the navbar → **Logout**).
2. On the Login page, enter:
   - Email: `admin@example.com`
   - Password: `Password123!`
3. Click **"Login"**.
4. **Expected:** You are logged in as Admin. The navbar dropdown shows admin pages (Employees, Accounts, Departments).

### E. Test Login (Second Pre-seeded User)

1. Log out first.
2. On the Login page, enter:
   - Email: `alice@example.com`
   - Password: `user123`
3. Click **"Login"**.
4. **Expected:** You are logged in as a regular user named Alice.

### F. Test Protected Routes

1. **While logged out**, try navigating to `#/profile` or `#/requests` in the browser URL bar.
2. **Expected:** You are redirected to the Login page with a warning toast.

### G. Test Admin-Only Routes

1. Log in as a **regular user** (e.g., `alice@example.com`).
2. Try navigating to `#/employees`, `#/accounts`, or `#/departments`.
3. **Expected:** You are redirected to the home page with an "Access denied" toast.
4. Log in as **admin** (`admin@example.com`) and try again.
5. **Expected:** Admin pages load successfully.

### H. Test Logout

1. While logged in, click your name in the navbar → **Logout**.
2. **Expected:** You are redirected to the home page. The navbar shows Login/Register links again.

### I. Test Session Persistence

1. Log in as any user.
2. **Refresh the page** (F5).
3. **Expected:** You remain logged in (the JWT token is stored in `sessionStorage`).
4. **Close the browser tab** and open a new one.
5. **Expected:** You are logged out (since `sessionStorage` is cleared when the tab is closed).

---

## Step 5: Verify Backend Security

### A. Test Invalid Credentials

1. Try logging in with a wrong password.
2. **Expected:** An error message appears: "Invalid credentials".

### B. Test Unverified Email

1. Register a new user but do NOT click "Simulate Email Verification".
2. Try logging in with that email.
3. **Expected:** An error message appears: "Please verify your email first".

### C. Test API Directly (Optional)

You can test the backend API directly using your browser's DevTools console:

```js
// Test public route
fetch('http://localhost:3000/api/content/guest')
  .then(res => res.json())
  .then(data => console.log(data));

// Test protected route without token (should fail with 401)
fetch('http://localhost:3000/api/profile')
  .then(res => console.log('Status:', res.status));

// Test admin route without token (should fail with 401)
fetch('http://localhost:3000/api/admin/dashboard')
  .then(res => console.log('Status:', res.status));

// Test admin route with a regular user's token (should fail with 403)
// First login as alice, then copy token from sessionStorage
const token = sessionStorage.getItem('authToken');
fetch('http://localhost:3000/api/admin/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => console.log('Status:', res.status));
```

### D. Test Role Tampering

1. Log in as a regular user.
2. Open DevTools → Application → Session Storage.
3. You will see the `authToken` JWT. Even if you try to decode and change the role, the server will reject it because the token signature won't match.
4. **This proves:** The backend enforces role checks, not the frontend.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Network error. Is the backend running?" | Make sure the backend is running (`npm run dev` in the `backend` folder). |
| CORS error in console | Make sure your Live Server URL matches the `origin` in `server.js`. Default is `http://127.0.0.1:5500` and `http://localhost:5500`. |
| "Cannot find module 'bcryptjs'" | Run `npm install` inside the `backend` folder. |
| Login works but page doesn't update | Make sure you refreshed the frontend after updating `script.js`. |
| Server port already in use | Another process is using port 3000. Stop it or change the `PORT` in `server.js`. |

---

## Summary of Test Accounts

| Email | Password | Role |
|---|---|---|
| admin@example.com | Password123! | admin |
| alice@example.com | user123 | user |

> **Note:** Since the backend uses an in-memory database, all data resets when you restart the server. Any users you register during testing will be lost on server restart.
