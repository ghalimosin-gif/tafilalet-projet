/**
 * Towing & Roadside Assistance Management System
 * Main Server Application
 */

require('dotenv').config();
require('./init-db');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const db = new Database(process.env.DB_PATH || './database.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// Rate limiting
// Custom handler that returns JSON for API endpoints and text for regular pages
const rateLimitHandler = (req, res) => {
  console.warn(`[RateLimit] ${req.ip} blocked on ${req.originalUrl || req.url}`);
  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    return res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
  return res.status(429).send('Too many requests, please try again later.');
};

// API-specific limiter (higher allowance for UI actions)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // allow more requests for API usage from a logged-in client
  handler: rateLimitHandler
});
app.use('/api', apiLimiter);

// Login rate limiting (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  handler: rateLimitHandler
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.set('trust proxy', 1);

app.use(session({
  name: 'towing.sid',
  secret: process.env.SESSION_SECRET || '42cf57fe172a13ce86fbabfb123f4e1d97f6b5365e9bba0df7115399a32d5791t',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,               // REQUIRED on Render
    httpOnly: true,
    sameSite: 'none',           // REQUIRED for proxy + HTTPS
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve static files
app.use(express.static('public'));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login.html');
  }
};

const requireAdmin = (req, res, next) => {
  if (req.session.userId && req.session.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin only.' });
  }
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Login endpoint
app.post('/api/login', loginLimiter, [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { username, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;
    req.session.role = user.role;

    res.json({
      success: true,
      role: user.role,
      fullName: user.full_name
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      role: req.session.role,
      fullName: req.session.fullName,
      username: req.session.username
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ============================================
// MISSION ROUTES
// ============================================

// Submit new mission
app.post('/api/missions', requireAuth, [
  body('missionDate').isISO8601(),
  body('missionTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('serviceType').trim().isLength({ min: 2 }).escape(),
  body('vehicleRegistration').trim().isLength({ min: 2 }).escape(),
  body('vehicleModel').trim().isLength({ min: 2 }).escape(),
  body('departureLocation').trim().isLength({ min: 3 }).escape(),
  body('arrivalLocation').trim().isLength({ min: 3 }).escape(),
  body('observations').optional().trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    missionDate,
    missionTime,
    serviceType,
    vehicleRegistration,
    vehicleModel,
    departureLocation,
    arrivalLocation,
    observations
  } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO missions (
        driver_id, mission_date, mission_time, service_type,
        vehicle_registration, vehicle_model, departure_location,
        arrival_location, observations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.session.userId,
      missionDate,
      missionTime,
      serviceType,
      vehicleRegistration,
      vehicleModel,
      departureLocation,
      arrivalLocation,
      observations || ''
    );

    res.json({
      success: true,
      missionId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Mission submission error:', error);
    res.status(500).json({ error: 'Failed to submit mission' });
  }
});

// Get missions (driver sees their own, admin sees all)
app.get('/api/missions', requireAuth, (req, res) => {
  const { search, startDate, endDate, serviceType } = req.query;

  try {
    let query = `
      SELECT 
        m.*,
        u.full_name as driver_name,
        u.username as driver_username
      FROM missions m
      JOIN users u ON m.driver_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // If driver, only show their missions
    if (req.session.role === 'driver') {
      query += ' AND m.driver_id = ?';
      params.push(req.session.userId);
    }

    // Search filter
    if (search) {
      query += ` AND (
        m.vehicle_registration LIKE ? OR
        m.vehicle_model LIKE ? OR
        m.departure_location LIKE ? OR
        m.arrival_location LIKE ? OR
        u.full_name LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Date filters
    if (startDate) {
      query += ' AND m.mission_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND m.mission_date <= ?';
      params.push(endDate);
    }

    // Service type filter
    if (serviceType) {
      query += ' AND m.service_type = ?';
      params.push(serviceType);
    }

    query += ' ORDER BY m.mission_date DESC, m.mission_time DESC';

    const missions = db.prepare(query).all(...params);
    res.json(missions);
  } catch (error) {
    console.error('Get missions error:', error);
    res.status(500).json({ error: 'Failed to retrieve missions' });
  }
});

// Get single mission
app.get('/api/missions/:id', requireAuth, (req, res) => {
  try {
    let query = `
      SELECT 
        m.*,
        u.full_name as driver_name,
        u.username as driver_username
      FROM missions m
      JOIN users u ON m.driver_id = u.id
      WHERE m.id = ?
    `;
    const params = [req.params.id];

    // If driver, only allow access to their own missions
    if (req.session.role === 'driver') {
      query += ' AND m.driver_id = ?';
      params.push(req.session.userId);
    }

    const mission = db.prepare(query).get(...params);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    res.json(mission);
  } catch (error) {
    console.error('Get mission error:', error);
    res.status(500).json({ error: 'Failed to retrieve mission' });
  }
});

// Update mission (admin only)
app.put('/api/missions/:id', requireAdmin, [
  body('missionDate').isISO8601(),
  body('missionTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('serviceType').trim().isLength({ min: 2 }).escape(),
  body('vehicleRegistration').trim().isLength({ min: 2 }).escape(),
  body('vehicleModel').trim().isLength({ min: 2 }).escape(),
  body('departureLocation').trim().isLength({ min: 3 }).escape(),
  body('arrivalLocation').trim().isLength({ min: 3 }).escape(),
  body('observations').optional().trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    missionDate,
    missionTime,
    serviceType,
    vehicleRegistration,
    vehicleModel,
    departureLocation,
    arrivalLocation,
    observations
  } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE missions SET
        mission_date = ?,
        mission_time = ?,
        service_type = ?,
        vehicle_registration = ?,
        vehicle_model = ?,
        departure_location = ?,
        arrival_location = ?,
        observations = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(
      missionDate,
      missionTime,
      serviceType,
      vehicleRegistration,
      vehicleModel,
      departureLocation,
      arrivalLocation,
      observations || '',
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update mission error:', error);
    res.status(500).json({ error: 'Failed to update mission' });
  }
});

// Delete mission (admin only)
app.delete('/api/missions/:id', requireAdmin, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM missions WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete mission error:', error);
    res.status(500).json({ error: 'Failed to delete mission' });
  }
});

// Export missions to CSV (admin only)
app.get('/api/missions/export/csv', requireAdmin, (req, res) => {
  try {
    const missions = db.prepare(`
      SELECT 
        m.id,
        m.mission_date,
        m.mission_time,
        u.full_name as driver_name,
        m.service_type,
        m.vehicle_registration,
        m.vehicle_model,
        m.departure_location,
        m.arrival_location,
        m.observations,
        m.created_at
      FROM missions m
      JOIN users u ON m.driver_id = u.id
      ORDER BY m.mission_date DESC, m.mission_time DESC
    `).all();

    // Create CSV
    const headers = [
      'ID', 'Date', 'Time', 'Driver', 'Service Type',
      'Vehicle Registration', 'Vehicle Model', 'Departure',
      'Arrival', 'Observations', 'Created At'
    ];

    let csv = headers.join(',') + '\n';

    missions.forEach(mission => {
      const row = [
        mission.id,
        mission.mission_date,
        mission.mission_time,
        `"${mission.driver_name}"`,
        `"${mission.service_type}"`,
        `"${mission.vehicle_registration}"`,
        `"${mission.vehicle_model}"`,
        `"${mission.departure_location}"`,
        `"${mission.arrival_location}"`,
        `"${mission.observations || ''}"`,
        mission.created_at
      ];
      csv += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=missions_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export missions' });
  }
});

// ============================================
// USER MANAGEMENT ROUTES (Admin only)
// ============================================

// Get all users
app.get('/api/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, full_name, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Create new user
app.post('/api/users', requireAdmin, [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().isLength({ min: 2 }).escape(),
  body('role').isIn(['admin', 'driver'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, fullName, role } = req.body;

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
      INSERT INTO users (username, password, full_name, role)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(username, hashedPassword, fullName, role);

    res.json({
      success: true,
      userId: result.lastInsertRowid
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:id', requireAdmin, [
  body('fullName').trim().isLength({ min: 2 }).escape(),
  body('role').isIn(['admin', 'driver']),
  body('isActive').isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, role, isActive } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE users SET
        full_name = ?,
        role = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(fullName, role, isActive ? 1 : 0, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change password
app.post('/api/users/:id/change-password', requireAdmin, [
  body('newPassword').isLength({ min: 6 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { newPassword } = req.body;

  try {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const stmt = db.prepare(`
      UPDATE users SET
        password = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(hashedPassword, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get statistics (admin only)
app.get('/api/stats', requireAdmin, (req, res) => {
  try {
    // Total missions
    const totalMissions = db.prepare('SELECT COUNT(*) as count FROM missions').get()?.count || 0;

    // Total drivers (users table)
    const totalDrivers = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;

    // Today missions
    const todayMissions = db.prepare(`
      SELECT COUNT(*) as count
      FROM missions
      WHERE date(mission_date) = date('now')
    `).get()?.count || 0;

    // Missions by service
    const missionsByService = db.prepare(`
      SELECT service_type, COUNT(*) as count
      FROM missions
      GROUP BY service_type
      ORDER BY count DESC
    `).all() || [];

    // Recent missions (join with users for driver_name)
    const recentMissions = db.prepare(`
      SELECT 
        m.*,
        u.full_name AS driver_name
      FROM missions m
      LEFT JOIN users u ON m.driver_id = u.id
      ORDER BY m.created_at DESC
      LIMIT 5
    `).all() || [];

    res.json({
      totalMissions,
      totalDrivers,
      todayMissions,
      missionsByService,
      recentMissions
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      details: error.message
    });
  }
});


// ============================================
// SERVE HTML PAGES
// ============================================

// Redirect root to login
app.get('/', (req, res) => {
  if (req.session.userId) {
    if (req.session.role === 'admin') {
      res.redirect('/admin.html');
    } else {
      res.redirect('/driver.html');
    }
  } else {
    res.redirect('/login.html');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚗 Towing & Roadside Assistance App running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing database...');
  db.close();
  process.exit(0);
});
