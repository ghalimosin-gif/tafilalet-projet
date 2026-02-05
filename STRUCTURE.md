# 🏗️ Application Structure & Flow

## Directory Structure

```
towing-app/
│
├── 📄 server.js                    # Main Express application (600+ lines)
│   ├── Authentication routes
│   ├── Mission CRUD operations
│   ├── User management (admin)
│   ├── Statistics & reporting
│   └── Security middleware
│
├── 📄 init-db.js                   # Database initialization
│   ├── Creates tables
│   ├── Sets up indexes
│   └── Inserts default users
│
├── 📄 package.json                 # Dependencies & scripts
├── 📄 .env                         # Environment configuration
├── 📄 .gitignore                   # Git ignore rules
├── 📄 README.md                    # Complete documentation
├── 📄 SETUP_GUIDE.md              # Step-by-step setup
└── 📄 FEATURES.md                 # Feature list
│
├── 📁 public/                      # Frontend files
│   │
│   ├── 🌐 login.html              # Login page
│   │   └── Features:
│   │       ├── Company logo area
│   │       ├── Username/password form
│   │       ├── Error display
│   │       └── Responsive design
│   │
│   ├── 🌐 driver.html             # Driver dashboard
│   │   └── Features:
│   │       ├── Header with logout
│   │       ├── New mission form
│   │       ├── Mission history
│   │       └── Search functionality
│   │
│   ├── 🌐 admin.html              # Admin dashboard
│   │   └── Features:
│   │       ├── Navigation tabs
│   │       ├── Statistics dashboard
│   │       ├── Mission management
│   │       ├── User management
│   │       ├── Edit modals
│   │       └── CSV export
│   │
│   ├── 🎨 styles.css              # Main stylesheet (1000+ lines)
│   │   └── Sections:
│   │       ├── CSS variables
│   │       ├── Global styles
│   │       ├── Login page
│   │       ├── Header & navigation
│   │       ├── Forms & inputs
│   │       ├── Buttons
│   │       ├── Cards & tables
│   │       ├── Modals
│   │       ├── Admin layout
│   │       └── Responsive breakpoints
│   │
│   ├── 📜 auth.js                 # Authentication logic
│   │   └── Functions:
│   │       ├── Login handler
│   │       ├── Logout handler
│   │       └── Auth check
│   │
│   ├── 📜 driver.js               # Driver dashboard logic
│   │   └── Functions:
│   │       ├── Load missions
│   │       ├── Submit mission
│   │       ├── Search missions
│   │       └── Form management
│   │
│   └── 📜 admin.js                # Admin dashboard logic
│       └── Functions:
│           ├── Tab navigation
│           ├── Load statistics
│           ├── Mission CRUD
│           ├── User management
│           ├── Filtering
│           └── CSV export
│
└── 🗄️ database.db                 # SQLite database (created after init)
    └── Tables:
        ├── users
        │   ├── id (PRIMARY KEY)
        │   ├── username (UNIQUE)
        │   ├── password (hashed)
        │   ├── full_name
        │   ├── role
        │   ├── is_active
        │   └── timestamps
        │
        └── missions
            ├── id (PRIMARY KEY)
            ├── driver_id (FOREIGN KEY)
            ├── mission_date
            ├── mission_time
            ├── service_type
            ├── vehicle_registration
            ├── vehicle_model
            ├── departure_location
            ├── arrival_location
            ├── observations
            └── timestamps
```

## 🔄 Application Flow

### User Login Flow
```
1. User visits http://localhost:3000
   ↓
2. Redirected to /login.html
   ↓
3. Enters credentials
   ↓
4. POST /api/login
   ↓
5. Server validates credentials
   ├─ Valid → Create session
   │   ├─ Admin → Redirect to /admin.html
   │   └─ Driver → Redirect to /driver.html
   └─ Invalid → Show error
```

### Driver Mission Submission Flow
```
1. Driver clicks "Nouvelle Mission"
   ↓
2. Form appears with current date/time
   ↓
3. Driver fills out form fields:
   - Date & Time
   - Service Type
   - Vehicle Info
   - Locations
   - Observations
   ↓
4. Driver submits form
   ↓
5. Frontend validation
   ↓
6. POST /api/missions
   ↓
7. Server validates & sanitizes
   ↓
8. Insert into database
   ↓
9. Success confirmation
   ↓
10. Reload mission list
```

### Admin Dashboard Flow
```
1. Admin logs in
   ↓
2. Load dashboard statistics:
   - GET /api/stats
   ├─ Total missions
   ├─ Total drivers
   ├─ Today's missions
   ├─ Recent missions
   └─ Service breakdown
   ↓
3. Admin can navigate to:
   ├─ Missions Tab
   │   ├─ GET /api/missions
   │   ├─ Filter & search
   │   ├─ Edit mission (PUT)
   │   ├─ Delete mission (DELETE)
   │   └─ Export CSV
   │
   └─ Users Tab
       ├─ GET /api/users
       ├─ Create user (POST)
       ├─ Update user (PUT)
       └─ Reset password (POST)
```

## 🔐 Security Flow

### Authentication
```
Login Request
   ↓
Rate Limiter (5 per 15min)
   ↓
Input Validation
   ↓
Database Query (prepared statement)
   ↓
Password Comparison (bcrypt)
   ↓
Session Creation
   ↓
Set HTTP-only Cookie
   ↓
Response with redirect
```

### Protected Routes
```
API Request
   ↓
Session Check Middleware
   ├─ Valid Session → Continue
   └─ No Session → 401 Unauthorized
       ↓
Role Check Middleware (if admin-only)
   ├─ Admin → Continue
   └─ Driver → 403 Forbidden
       ↓
Input Validation
   ↓
Sanitization
   ↓
Execute Request
   ↓
Response
```

## 🎨 UI Component Hierarchy

### Login Page
```
login.html
├── .login-container
    └── .login-card
        ├── .logo-container
        │   ├── Logo SVG
        │   └── Title/Subtitle
        ├── .login-form
        │   ├── Username input
        │   ├── Password input
        │   ├── Error message
        │   └── Submit button
        └── .login-footer
```

### Driver Dashboard
```
driver.html
├── .app-header
│   ├── Logo
│   ├── Title
│   └── User info + Logout
├── .container
│   ├── .dashboard-header
│   │   ├── Title
│   │   └── New Mission button
│   ├── .card (Mission Form)
│   │   └── Form fields
│   └── .card (Mission List)
│       ├── Search bar
│       └── .missions-list
│           └── .mission-item (repeated)
```

### Admin Dashboard
```
admin.html
├── .app-header
│   └── Same as driver
├── .admin-layout
│   ├── .sidebar
│   │   └── .sidebar-nav
│   │       ├── Dashboard link
│   │       ├── Missions link
│   │       └── Users link
│   └── .admin-content
│       ├── #dashboardTab
│       │   ├── Stats grid
│       │   └── Dashboard grid
│       ├── #missionsTab
│       │   ├── Filters
│       │   └── Table
│       └── #usersTab
│           └── Table
└── Modals
    ├── Edit Mission Modal
    └── Add User Modal
```

## 📡 API Endpoints Map

```
Authentication
├── POST   /api/login              ✓ Public
├── POST   /api/logout             ✓ Authenticated
└── GET    /api/auth/check         ✓ Any

Missions
├── GET    /api/missions           ✓ Authenticated (filtered by role)
├── POST   /api/missions           ✓ Authenticated
├── GET    /api/missions/:id       ✓ Authenticated (own or admin)
├── PUT    /api/missions/:id       ⚡ Admin only
├── DELETE /api/missions/:id       ⚡ Admin only
└── GET    /api/missions/export/csv ⚡ Admin only

Users
├── GET    /api/users              ⚡ Admin only
├── POST   /api/users              ⚡ Admin only
├── PUT    /api/users/:id          ⚡ Admin only
└── POST   /api/users/:id/change-password ⚡ Admin only

Statistics
└── GET    /api/stats              ⚡ Admin only

Legend:
✓ = Authenticated required
⚡ = Admin role required
```

## 🔄 Data Flow Diagram

```
Frontend (HTML/JS)
        ↕
    Fetch API
        ↕
Express Routes (server.js)
        ↕
  Middleware Stack
  ├── Helmet (security headers)
  ├── Rate Limiter
  ├── Body Parser
  ├── Session Manager
  └── Auth Check
        ↕
Input Validation
        ↕
Database Operations (SQLite)
        ↕
Response JSON
        ↕
Frontend Updates UI
```

## 📦 Dependencies Tree

```
Production Dependencies:
├── express@4.18.2           # Web framework
├── express-session@1.17.3   # Session management
├── bcryptjs@2.4.3          # Password hashing
├── better-sqlite3@9.2.2    # SQLite database
├── express-validator@7.0.1  # Input validation
├── helmet@7.1.0            # Security headers
├── express-rate-limit@7.1.5 # Rate limiting
└── dotenv@16.3.1           # Environment variables

Development Dependencies:
└── nodemon@3.0.2           # Auto-restart server
```

---

This structure provides a complete, maintainable, and scalable foundation for the roadside assistance management system.
