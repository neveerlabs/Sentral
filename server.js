require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
app.set('db', pool);

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, pool);

const allowedOrigin = process.env.NODE_ENV === 'production'
  ? process.env.BASE_URL
  : 'http://localhost:3000';

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  if (id === 'admin') {
    return done(null, {
      id: 'admin',
      name: 'Admin',
      email: null,
      profile_picture: null,
      role: 'admin'
    });
  }
  try {
    const [rows] = await pool.query('SELECT id, email, name, profile_picture, role FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return done(null, false);
    done(null, rows[0]);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);
      if (rows.length) {
        return done(null, rows[0]);
      }

      const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [profile.emails[0].value]);
      if (existing.length) {
        await pool.query('UPDATE users SET google_id = ?, profile_picture = ? WHERE id = ?',
          [profile.id, profile.photos[0].value, existing[0].id]);
        const [updated] = await pool.query('SELECT * FROM users WHERE id = ?', [existing[0].id]);
        return done(null, updated[0]);
      }

      const [result] = await pool.query(
        'INSERT INTO users (email, name, google_id, profile_picture, role) VALUES (?, ?, ?, ?, ?)',
        [profile.emails[0].value, profile.displayName, profile.id, profile.photos[0].value, 'user']
      );
      const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return done(null, newUser[0]);
    } catch (err) {
      return done(err, null);
    }
  }
));

app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json({ loggedIn: true, user: req.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.get('/api/whatsapp', (req, res) => {
  const whatsappNumber = process.env.NOMOR || '628561765372';
  res.json({ number: whatsappNumber });
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return res.status(500).json({ error: 'Admin credentials not configured' });
  }

  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const adminUser = {
    id: 'admin',
    name: 'Admin',
    email: null,
    profile_picture: null,
    role: 'admin'
  };

  req.login(adminUser, (err) => {
    if (err) return res.status(500).json({ error: 'Login failed' });
    res.json({ success: true, user: adminUser });
  });
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/id/login.html' }), (req, res) => {
  res.redirect('/');
});

const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

const categoriesRouter = require('./routes/categories');
app.use('/api/categories', categoriesRouter);

const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});