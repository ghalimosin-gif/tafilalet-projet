# 🚀 Quick Setup Guide

## Step 1: Prerequisites Check

Before starting, make sure you have Node.js installed:

```bash
node --version
```

If not installed, download from: https://nodejs.org/ (LTS version recommended)

## Step 2: Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

This will install all required packages:
- Express (web framework)
- bcryptjs (password hashing)
- better-sqlite3 (database)
- express-session (authentication)
- helmet (security)
- And more...

## Step 3: Configure Environment

The `.env` file contains important configuration. For production, you MUST change:

```env
SESSION_SECRET=your-random-string-here-make-it-long-and-complex
ADMIN_PASSWORD=YourSecurePassword123!
```

To generate a secure session secret, you can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Initialize Database

Run the database initialization script:

```bash
npm run init-db
```

You should see:
```
✅ Database initialized successfully!

📝 Default Login Credentials:
   Admin: username: admin, password: Admin123!
   Driver 1: username: driver1, password: Driver123!
   ...
```

## Step 5: Start the Server

```bash
npm start
```

You should see:
```
🚗 Towing & Roadside Assistance App running on http://localhost:3000
📊 Environment: development
```

## Step 6: Access the Application

Open your web browser and go to:

```
http://localhost:3000
```

You'll be redirected to the login page.

## Step 7: First Login

Use the default admin credentials:
- **Username:** admin
- **Password:** Admin123!

After logging in, you'll see the admin dashboard.

## Step 8: Security - Change Default Passwords

**IMPORTANT:** Immediately change the default passwords!

1. Go to the "Utilisateurs" (Users) tab
2. Click the key icon next to the admin user
3. Enter a new secure password
4. Do the same for all driver accounts

## Step 9: Add Your Company Logo

1. Open `public/login.html`
2. Find the logo placeholder section
3. Replace with your logo:

```html
<div class="logo-placeholder">
    <img src="logo.png" alt="Company Logo" style="height: 80px;">
</div>
```

4. Add your logo file to the `public/` folder

## Step 10: Test the System

### As a Driver:
1. Logout from admin account
2. Login with: username: `driver1`, password: `Driver123!`
3. Click "Nouvelle Mission"
4. Fill out the form and submit
5. Check that the mission appears in your list

### As an Admin:
1. Login as admin
2. Check the dashboard for statistics
3. Go to "Missions" tab to see all missions
4. Try editing and filtering missions
5. Test the CSV export feature
6. Go to "Utilisateurs" to manage users

## 🎉 You're All Set!

Your roadside assistance management system is now ready to use!

## Common Issues & Solutions

### Issue: "Cannot find module..."
**Solution:** Run `npm install` again

### Issue: "Port 3000 is already in use"
**Solution:** Either:
1. Stop the other application using port 3000, or
2. Change the port in `.env`:
   ```env
   PORT=3001
   ```

### Issue: Database is locked
**Solution:** Restart the server. Only one process can access SQLite at a time.

### Issue: Cannot login
**Solution:** 
1. Make sure the database was initialized (`npm run init-db`)
2. Check that cookies are enabled in your browser
3. Try clearing browser cache and cookies

## Next Steps

- Customize the service types in the dropdown menus
- Add more drivers through the admin panel
- Set up automatic backups of the database
- Consider deploying to a production server

## Need Help?

Check the full README.md for:
- Complete API documentation
- Security best practices
- Production deployment guide
- Customization options

---

Happy Managing! 🚗💨
