// server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret'; // In production, use environment variables!

// Enable CORS for frontend (e.g., Live Server on port 5500)
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'] // Adjust based on your frontend URL
}));

// Middleware to parse JSON
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// In-memory "database" (replace with MySQL later)
let users = [
    {
        id: 1,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: bcrypt.hashSync('Password123!', 10),
        role: 'admin',
        verified: true
    },
    {
        id: 2,
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        password: bcrypt.hashSync('user123', 10),
        role: 'user',
        verified: true
    }
];

// AUTH ROUTES

// POST /api/register
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = users.find(u => u.email === email.toLowerCase());
    if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'user',
        verified: false
    };

    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully' });
});

// POST /api/verify-email (simulate email verification)
app.post('/api/verify-email', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
        return res.status(404).json({ error: 'Account not found' });
    }

    user.verified = true;
    res.json({ message: 'Email verified successfully' });
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.verified) {
        return res.status(403).json({ error: 'Please verify your email first' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token (expires in 1 hour)
    const token = jwt.sign(
        { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
        SECRET_KEY,
        { expiresIn: '1h' }
    );

    res.json({
        token,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        }
    });
});

// PROTECTED ROUTE: Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// ROLE-BASED PROTECTED ROUTE: Admin-only
app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({ message: 'Welcome to admin dashboard!', data: 'Secret admin info' });
});

// PUBLIC ROUTE: Guest content
app.get('/api/content/guest', (req, res) => {
    res.json({ message: 'Public content for all visitors' });
});

// MIDDLEWARE

// Token authentication
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = decoded;
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

// Start server
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`Try logging in with:`);
    console.log(`  - Admin: email=admin@example.com, password=Password123!`);
    console.log(`  - User:  email=alice@example.com, password=user123`);
});