# 🚗 Roadside Assistance Management System

A professional, secure web application for managing towing and roadside assistance operations (dépannage). Built with Node.js, Express, SQLite, and modern web technologies.

## ✨ Features

### 🔐 Security & Authentication
- Secure login system with bcrypt password hashing
- Session-based authentication
- Role-based access control (Admin & Driver)
- Rate limiting to prevent brute force attacks
- Input validation and sanitization
- SQL injection protection
- CSRF protection with Helmet.js

### 👤 Driver Features
- Personal dashboard
- Submit mission reports with:
  - Date and time
  - Type of service/dépannage
  - Vehicle registration and model
  - Departure and arrival locations
  - Observations/notes
- View personal mission history
- Search through missions

### 👨‍💼 Admin Features
- Comprehensive dashboard with statistics
- View all missions from all drivers
- Advanced filtering (date range, service type, search)
- Edit and delete missions
- Export data to CSV
- User management:
  - Create new users (drivers/admins)
  - Activate/deactivate users
  - Reset passwords
- Real-time statistics and reports

### 🎨 Design
- Modern, responsive design with red theme
- Mobile-friendly and desktop-friendly
- Clean, professional interface
- Company logo placeholder

## 🚀 Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. **Extract or navigate to the project directory:**
```bash
cd towing-app
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Edit the `.env` file and change the default values:
```env
# IMPORTANT: Change these in production!
SESSION_SECRET=your-very-secure-random-string-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
```

4. **Initialize the database:**
```bash
npm run init-db
```

This will create the database and insert default users.

5. **Start the application:**
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

6. **Access the application:**
Open your browser and navigate to:
```
http://localhost:3000
```

## 🔑 Default Login Credentials

After initialization, you can login with these credentials:

**Admin Account:**
- Username: `admin`
- Password: `Admin123!`

**Driver Accounts (for testing):**
- Username: `driver1` | Password: `Driver123!`
- Username: `driver2` | Password: `Driver123!`
- Username: `driver3` | Password: `Driver123!`

⚠️ **IMPORTANT:** Change these passwords immediately after first login, especially in production!

## 📁 Project Structure

```
towing-app/
├── server.js              # Main Express application
├── init-db.js            # Database initialization script
├── package.json          # Project dependencies
├── .env                  # Environment configuration
├── database.db           # SQLite database (created after init)
└── public/               # Frontend files
    ├── login.html        # Login page
    ├── driver.html       # Driver dashboard
    ├── admin.html        # Admin dashboard
    ├── styles.css        # Main stylesheet
    ├── auth.js          # Authentication logic
    ├── driver.js        # Driver dashboard logic
    └── admin.js         # Admin dashboard logic
```

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `password` - Bcrypt hashed password
- `full_name` - User's full name
- `role` - 'admin' or 'driver'
- `is_active` - Account status
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Missions Table
- `id` - Primary key
- `driver_id` - Foreign key to users
- `mission_date` - Date of mission
- `mission_time` - Time of mission
- `service_type` - Type of service provided
- `vehicle_registration` - Client vehicle registration
- `vehicle_model` - Client vehicle model
- `departure_location` - Starting location
- `arrival_location` - Destination location
- `observations` - Additional notes
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## 🔒 Security Features

1. **Password Security:**
   - Passwords are hashed using bcrypt (10 rounds)
   - Never stored in plain text

2. **Session Security:**
   - HTTP-only cookies
   - Secure flag in production
   - 24-hour session timeout

3. **Input Validation:**
   - All inputs are validated and sanitized
   - Protection against XSS attacks
   - SQL injection prevention via prepared statements

4. **Rate Limiting:**
   - Login attempts limited to prevent brute force
   - General API rate limiting

5. **Security Headers:**
   - Helmet.js for security headers
   - Content Security Policy
   - XSS protection

## 🎨 Customization

### Adding Your Company Logo

Replace the SVG logo in the HTML files with your actual logo:

1. In `login.html`, find the `.logo-placeholder` div
2. In `driver.html` and `admin.html`, find the `.logo-small` div
3. Replace the SVG with your logo image:

```html
<img src="your-logo.png" alt="Company Logo" style="height: 40px;">
```

### Changing the Theme Color

The red theme can be customized in `styles.css`:

```css
:root {
    --primary-red: #dc2626;        /* Main red color */
    --primary-red-dark: #b91c1c;   /* Darker shade */
    --primary-red-light: #ef4444;  /* Lighter shade */
}
```

### Adding Service Types

To add more service types, edit the select options in:
- `driver.html` - Mission form
- `admin.html` - Edit mission modal and filter

## 📊 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Missions
- `GET /api/missions` - Get missions (filtered by role)
- `POST /api/missions` - Create new mission
- `GET /api/missions/:id` - Get single mission
- `PUT /api/missions/:id` - Update mission (admin only)
- `DELETE /api/missions/:id` - Delete mission (admin only)
- `GET /api/missions/export/csv` - Export missions to CSV (admin only)

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/change-password` - Change user password

### Statistics (Admin only)
- `GET /api/stats` - Get dashboard statistics

## 🚀 Production Deployment

### Before Deploying:

1. **Update environment variables:**
```env
NODE_ENV=production
SESSION_SECRET=generate-a-very-long-random-string
PORT=3000
```

2. **Change default passwords:**
   - Login as admin and create a new admin account
   - Delete or disable the default admin account

3. **Enable HTTPS:**
   - Use a reverse proxy (nginx, Apache)
   - Configure SSL certificates

4. **Database backups:**
   - Regularly backup `database.db`
   - Consider using a more robust database for production (PostgreSQL, MySQL)

5. **Use a process manager:**
```bash
npm install -g pm2
pm2 start server.js --name towing-app
pm2 save
pm2 startup
```

### Recommended Hosting Options:
- VPS (DigitalOcean, Linode, AWS EC2)
- Platform as a Service (Heroku, Railway, Render)
- Dedicated server

## 🔧 Troubleshooting

### Database locked error:
The database might be locked by another process. Restart the server.

### Port already in use:
Change the PORT in `.env` file or kill the process using the port:
```bash
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>
```

### Cannot login:
1. Check that the database was initialized
2. Verify credentials
3. Check browser console for errors
4. Ensure cookies are enabled

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments
3. Check server logs for errors

## 📝 License

MIT License - Feel free to use and modify for your needs.

## ⚠️ Important Notes

1. **Always change default passwords in production**
2. **Keep your `.env` file secure and never commit it to version control**
3. **Regularly backup your database**
4. **Use HTTPS in production**
5. **Keep dependencies updated for security patches**

## 🔄 Updates & Maintenance

To update dependencies:
```bash
npm update
```

To check for security vulnerabilities:
```bash
npm audit
npm audit fix
```

---

Built with ❤️ for roadside assistance professionals
