/**
 * Database Initialization Script
 * This script creates the database schema and inserts initial data
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.env.DB_PATH || './database.db';
const db = new Database(dbPath);

console.log('🔧 Initializing database...');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'driver')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create missions table
db.exec(`
  CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    mission_date TEXT NOT NULL,
    mission_time TEXT NOT NULL,
    service_type TEXT NOT NULL,
    vehicle_registration TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    departure_location TEXT NOT NULL,
    arrival_location TEXT NOT NULL,
    observations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(id)
  )
`);

// Create indexes for better performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_missions_driver ON missions(driver_id);
  CREATE INDEX IF NOT EXISTS idx_missions_date ON missions(mission_date);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

// Insert default admin user
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
const hashedPassword = bcrypt.hashSync(adminPassword, 10);

const insertAdmin = db.prepare(`
  INSERT OR IGNORE INTO users (username, password, full_name, role)
  VALUES (?, ?, ?, ?)
`);

insertAdmin.run(adminUsername, hashedPassword, 'Administrator', 'admin');

// Insert sample drivers (for testing)
const insertDriver = db.prepare(`
  INSERT OR IGNORE INTO users (username, password, full_name, role)
  VALUES (?, ?, ?, ?)
`);

const sampleDrivers = [
  { username: 'Abdelaali', password: 'Abdelaali123', name: 'Abdelaali Naciri' },
  { username: 'Ayoub', password: 'Ayoub123', name: 'Ayoub Zouadi' },
  { username: 'Kamal', password: 'Kamal123', name: 'Kamal Mouzouri' }
];

sampleDrivers.forEach(driver => {
  const hashedPwd = bcrypt.hashSync(driver.password, 10);
  insertDriver.run(driver.username, hashedPwd, driver.name, 'driver');
});

console.log('✅ Database initialized successfully!');
console.log('');
console.log('📝 Default Login Credentials:');
console.log('   Admin: username: admin, password: Admin123!');
console.log('   Driver 1: username: driver1, password: Driver123!');
console.log('   Driver 2: username: driver2, password: Driver123!');
console.log('   Driver 3: username: driver3, password: Driver123!');
console.log('');
console.log('⚠️  IMPORTANT: Change these passwords in production!');

db.close();
