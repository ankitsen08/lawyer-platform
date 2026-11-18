const { loadEnv } = require('./utils/env');
loadEnv();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// Utilities & Middleware
const { hashPassword, comparePassword } = require('./utils/auth');
const { authenticate, optionalAuth, requireRole } = require('./middleware/auth');
const { seedDatabase, INITIAL_LAWYERS } = require('./seed');
const { securityHeaders, createRateLimiter, requestLogger } = require('./middleware/security');
const { generateIcsCalendar, generateGoogleCalendarUrl, sendTransactionalEmail, sendVerificationEmail } = require('./utils/notifications');
const { createCheckoutSession, PLANS } = require('./utils/stripe');
const {
  sanitizeText,
  sanitizePhone,
  sanitizeZipCode,
  sanitizeOnboardingData,
  normalizeUrgency,
  normalizeContactMethod,
  normalizeBudgetRange,
  sanitizeEnum,
} = require('./utils/sanitize');

// Models
const Message = require('./models/Message');
const Consultation = require('./models/Consultation');
const User = require('./models/User');
const ProfileView = require('./models/ProfileView');
const Question = require('./models/Question');
const Answer = require('./models/Answer');
const SavedAttorney = require('./models/SavedAttorney');
const Inquiry = require('./models/Inquiry');

const app = express();

// Security Headers & Request Logger
app.use(securityHeaders);
app.use(requestLogger);

// Rate Limiters
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 30, message: 'Too many login attempts. Please try again later.' });
const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 120, message: 'Request limit reached. Please wait a moment before submitting again.' });

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl) or localhost, or configured origin
    if (!origin || origin === CLIENT_ORIGIN || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for prototype & dev previews
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let isMongoConnected = false;
const fallbackMessages = [];
const fallbackSavedAttorneys = {}; // map of clientId -> Set of lawyerIds
const fallbackUsers = new Map(); // Global in-memory user registry keyed by email and ID
const fallbackInquiries = []; // In-memory inquiry/intake dossier store
const fallbackConsultations = []; // In-memory consultations store

function isAuthorizedAccount(req, targetIdentifier) {
  if (!targetIdentifier) return false;
  const lowerTarget = String(targetIdentifier).toLowerCase().trim();
  const candidates = [req.user, req.clientUser, req.lawyerUser].filter(Boolean);
  return candidates.some(u =>
    String(u.id) === String(targetIdentifier) ||
    (u.email && u.email.toLowerCase().trim() === lowerTarget)
  );
}

// Pre-seed default lawyer directory into fallbackUsers for fallback operation
INITIAL_LAWYERS.forEach((lawyer, idx) => {
  const lawyerId = `lwy-00${idx + 1}`;
  const lawyerDoc = {
    _id: lawyerId,
    id: lawyerId,
    ...lawyer,
    passwordHash: hashPassword('password123'),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  fallbackUsers.set(lawyer.email.toLowerCase(), lawyerDoc);
  fallbackUsers.set(lawyerId, lawyerDoc);
});

// Database Connection
const ATLAS_URI = 'mongodb://adityavishwa02_db_user:qO6CycHj3Dp3kzxR@ac-dp9nud3-shard-00-00.efy92ow.mongodb.net:27017,ac-dp9nud3-shard-00-01.efy92ow.mongodb.net:27017,ac-dp9nud3-shard-00-02.efy92ow.mongodb.net:27017/lawyer_directory?ssl=true&replicaSet=atlas-srphut-shard-0&authSource=admin&appName=Cluster0';
const MONGODB_URI = process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? ATLAS_URI : (process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/lawyer_directory'));
const JWT_SECRET = process.env.JWT_SECRET || 'production_secure_lawyer_comparison_secret_jwt_key_2026';

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log('[+] Connected to MongoDB');
    isMongoConnected = true;
    await seedDatabase();
  })
  .catch(err => {
    console.error('[-] MongoDB Connection Error:', err.message);
    console.warn('[!] Running in resilient in-memory mode for development without local MongoDB.');
  });

// Helper to set secure auth cookie
function setAuthCookie(res, role, token) {
  const cookieName = role === 'client' ? 'client_session' : 'lawyer_session';
  res.cookie(cookieName, token, {
    httpOnly: true, // Secure against XSS token exfiltration
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// ----------------------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------------------

// Helper: Sync onboarding case profile into an Inquiry dossier for attorney matching & review
async function syncOnboardingInquiry({ userId, fullName, email, contact, caseProfile }) {
  if (!caseProfile) return null;
  contact = contact || {};
  const hasMeaningfulCaseInfo = Boolean(
    caseProfile.notes ||
    caseProfile.opposingParty ||
    caseProfile.legalSubCategory ||
    (caseProfile.legalCategory && caseProfile.legalCategory !== 'General Practice / Civil Litigation' && caseProfile.legalCategory !== 'General Practice') ||
    (caseProfile.attachments && caseProfile.attachments.length > 0)
  );
  if (!hasMeaningfulCaseInfo) return null;

  const summaryDescription = caseProfile.notes ||
    `Client onboarding dossier submitted for ${caseProfile.legalCategory}${caseProfile.legalSubCategory ? ` (${caseProfile.legalSubCategory})` : ''}.`;

  if (isMongoConnected) {
    const existing = await Inquiry.findOne({ clientId: userId, source: 'onboarding_wizard' });
    if (existing) {
      existing.fullName = fullName;
      existing.email = email;
      existing.phone = contact.phone;
      existing.smsConsent = contact.smsConsent;
      existing.city = contact.city;
      existing.state = contact.state;
      existing.zipCode = contact.zipCode;
      existing.preferredContactMethod = contact.preferredContactMethod;
      existing.issue = caseProfile.legalCategory;
      existing.subCategory = caseProfile.legalSubCategory;
      existing.urgency = caseProfile.urgency;
      existing.incidentDate = caseProfile.incidentDate;
      existing.opposingParty = caseProfile.opposingParty;
      existing.budgetRange = caseProfile.budgetRange;
      existing.description = summaryDescription;
      existing.attachments = caseProfile.attachments;
      await existing.save();
      return existing;
    }

    return Inquiry.create({
      lawyerId: 'general',
      lawyerName: 'Matched Attorneys',
      clientId: userId,
      fullName,
      email,
      phone: contact.phone,
      smsConsent: contact.smsConsent,
      city: contact.city,
      state: contact.state,
      zipCode: contact.zipCode,
      preferredContactMethod: contact.preferredContactMethod,
      issue: caseProfile.legalCategory,
      subCategory: caseProfile.legalSubCategory,
      urgency: caseProfile.urgency,
      incidentDate: caseProfile.incidentDate,
      opposingParty: caseProfile.opposingParty,
      budgetRange: caseProfile.budgetRange,
      description: summaryDescription,
      attachments: caseProfile.attachments,
      source: 'onboarding_wizard',
      conflictStatus: 'pending',
      status: 'new',
    });
  } else {
    const existing = fallbackInquiries.find(i => i.clientId === userId && i.source === 'onboarding_wizard');
    if (existing) {
      Object.assign(existing, {
        fullName,
        email,
        phone: contact.phone,
        smsConsent: contact.smsConsent,
        city: contact.city,
        state: contact.state,
        zipCode: contact.zipCode,
        preferredContactMethod: contact.preferredContactMethod,
        issue: caseProfile.legalCategory,
        subCategory: caseProfile.legalSubCategory,
        urgency: caseProfile.urgency,
        incidentDate: caseProfile.incidentDate,
        opposingParty: caseProfile.opposingParty,
        budgetRange: caseProfile.budgetRange,
        description: summaryDescription,
        attachments: caseProfile.attachments,
        updatedAt: new Date()
      });
      return existing;
    }

    const memInquiry = {
      id: 'inq-' + Date.now(),
      _id: 'inq-' + Date.now(),
      lawyerId: 'general',
      lawyerName: 'Matched Attorneys',
      clientId: userId,
      fullName,
      email,
      phone: contact.phone,
      smsConsent: contact.smsConsent,
      city: contact.city,
      state: contact.state,
      zipCode: contact.zipCode,
      preferredContactMethod: contact.preferredContactMethod,
      issue: caseProfile.legalCategory,
      subCategory: caseProfile.legalSubCategory,
      urgency: caseProfile.urgency,
      incidentDate: caseProfile.incidentDate,
      opposingParty: caseProfile.opposingParty,
      budgetRange: caseProfile.budgetRange,
      description: summaryDescription,
      attachments: caseProfile.attachments,
      source: 'onboarding_wizard',
      conflictStatus: 'pending',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    fallbackInquiries.unshift(memInquiry);
    return memInquiry;
  }
}

// Helper to dynamically resolve client origin from incoming request or environment
function getClientOrigin(req) {
  if (req) {
    const raw = req.headers?.origin || (req.headers?.referer ? (() => { try { return new URL(req.headers.referer).origin; } catch(_) { return null; } })() : null);
    if (raw && (raw.includes('localhost') || raw.includes('127.0.0.1') || raw.includes('lawyercomparison') || raw.includes('vercel.app'))) {
      return raw;
    }
  }
  return process.env.CLIENT_ORIGIN || 'http://localhost:3000';
}

// Public HTTPS application URL for outgoing emails delivered across the internet
function getPublicAppUrl(req) {
  if (req) {
    const raw = req.headers?.origin || (req.headers?.referer ? (() => { try { return new URL(req.headers.referer).origin; } catch(_) { return null; } })() : null);
    if (raw && raw.startsWith('https://') && !raw.includes('localhost') && !raw.includes('127.0.0.1')) {
      return raw;
    }
  }
  return process.env.PUBLIC_APP_URL || 'https://lawyercomparison.us';
}

// Register Endpoint
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, role, name, firstName, lastName, firmName, specialty } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = sanitizeText(email, 160).toLowerCase();
    const cleanName = sanitizeText(name || `${firstName || ''} ${lastName || ''}`, 120);
    const parsedFirstName = firstName ? sanitizeText(firstName, 60) : (cleanName ? cleanName.split(' ')[0] : 'User');
    const parsedLastName = lastName ? sanitizeText(lastName, 60) : (cleanName ? cleanName.split(' ').slice(1).join(' ') : '');
    const fullName = cleanName || `${parsedFirstName} ${parsedLastName}`.trim();
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const passwordHash = hashPassword(password);

    const sanitizedOnboarding = role === 'client' ? sanitizeOnboardingData(req.body) : { error: null, contact: {}, caseProfile: undefined };
    if (sanitizedOnboarding.error) {
      return res.status(400).json({ error: sanitizedOnboarding.error });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiration window
    const clientOrigin = getClientOrigin(req);
    const publicAppUrl = getPublicAppUrl(req);
    const verificationUrl = `${publicAppUrl}/verify-email?token=${verificationToken}`;
    const localVerificationUrl = `${clientOrigin}/verify-email?token=${verificationToken}`;

    if (isMongoConnected) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const userPayload = {
        email: cleanEmail,
        passwordHash,
        role,
        name: fullName,
        firstName: parsedFirstName,
        lastName: parsedLastName,
        firmName: role === 'lawyer' ? sanitizeText(firmName || 'Independent Practice', 120) : undefined,
        specialty: role === 'lawyer' ? sanitizeText(specialty || 'General Practice', 100) : undefined,
        onboarded: role === 'client' ? true : false,
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
        lastLoginAt: new Date(),
        lastLoginIp: clientIp
      };

      if (role === 'client') {
        Object.assign(userPayload, sanitizedOnboarding.contact);
        userPayload.caseProfile = sanitizedOnboarding.caseProfile;
      }

      const user = await User.create(userPayload);

      if (role === 'client') {
        await syncOnboardingInquiry({
          userId: user._id.toString(),
          fullName,
          email: cleanEmail,
          contact: sanitizedOnboarding.contact,
          caseProfile: sanitizedOnboarding.caseProfile
        });
      }

      const userJson = user.toObject();
      delete userJson.passwordHash;
      delete userJson.verificationToken; // Do not expose raw token in user profile payload

      // Keep in-memory cache synchronized with MongoDB Atlas
      fallbackUsers.set(cleanEmail, userJson);
      fallbackUsers.set(user._id.toString(), userJson);

      // Dispatch activation email asynchronously
      sendVerificationEmail({
        to: cleanEmail,
        name: fullName || parsedFirstName,
        verificationUrl,
        token: verificationToken
      }).catch(mailErr => console.error('[Email] Failed to dispatch verification email:', mailErr));

      const token = jwt.sign({ 
        id: user._id.toString(), 
        email: user.email, 
        role: user.role,
        name: user.name || fullName
      }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, role, token);

      return res.status(201).json({ success: true, user: userJson, token, verificationSent: true });
    } else {
      // In-memory fallback: store user in fallbackUsers registry
      if (fallbackUsers.has(cleanEmail)) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const mockId = 'usr-' + Date.now();
      const mockUser = {
        _id: mockId,
        id: mockId,
        email: cleanEmail,
        passwordHash,
        role,
        name: fullName,
        firstName: parsedFirstName,
        lastName: parsedLastName,
        phone: role === 'client' ? sanitizedOnboarding.contact.phone : '',
        smsConsent: role === 'client' ? sanitizedOnboarding.contact.smsConsent : false,
        city: role === 'client' ? sanitizedOnboarding.contact.city : '',
        state: role === 'client' ? sanitizedOnboarding.contact.state : '',
        zipCode: role === 'client' ? sanitizedOnboarding.contact.zipCode : '',
        location: role === 'client' ? sanitizedOnboarding.contact.location : 'United States',
        preferredContactMethod: role === 'client' ? sanitizedOnboarding.contact.preferredContactMethod : 'email',
        firmName: role === 'lawyer' ? sanitizeText(firmName || 'Independent Practice', 120) : undefined,
        specialty: role === 'lawyer' ? sanitizeText(specialty || 'General Practice', 100) : undefined,
        onboarded: role === 'client' ? true : false,
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
        caseProfile: role === 'client' ? sanitizedOnboarding.caseProfile : undefined,
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      fallbackUsers.set(cleanEmail, mockUser);
      fallbackUsers.set(mockId, mockUser);

      if (role === 'client') {
        await syncOnboardingInquiry({
          userId: mockId,
          fullName,
          email: cleanEmail,
          contact: sanitizedOnboarding.contact,
          caseProfile: sanitizedOnboarding.caseProfile
        });
      }

      // Dispatch activation email asynchronously
      sendVerificationEmail({
        to: cleanEmail,
        name: fullName || parsedFirstName,
        verificationUrl,
        token: verificationToken
      }).catch(mailErr => console.error('[Email] Failed to dispatch verification email:', mailErr));

      const token = jwt.sign({ 
        id: mockId, 
        email: cleanEmail, 
        role,
        name: fullName
      }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, role, token);

      const sanitizedUser = { ...mockUser };
      delete sanitizedUser.passwordHash;
      delete sanitizedUser.verificationToken;

      return res.status(201).json({ success: true, user: sanitizedUser, token, verificationSent: true });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Failed to create account' });
  }
});

// Login Endpoint
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    if (isMongoConnected) {
      let user = await User.findOne({ email: cleanEmail, role });
      
      // If user does not exist, return 401
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const isMatch = comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Security Audit Telemetry
      user.lastLoginAt = new Date();
      user.lastLoginIp = clientIp;
      await user.save();

      const userJson = user.toObject();
      delete userJson.passwordHash;

      // Keep cache synchronized
      fallbackUsers.set(cleanEmail, userJson);
      fallbackUsers.set(user._id.toString(), userJson);

      const token = jwt.sign({ 
        id: user._id.toString(), 
        email: user.email, 
        role: user.role,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, role, token);

      return res.json({ success: true, user: userJson, token });
    } else {
      // In-memory fallback
      let user = fallbackUsers.get(cleanEmail);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.role && role && user.role !== role) {
        return res.status(401).json({ error: `Account exists as ${user.role}, not ${role}` });
      }

      // Check password if set
      if (user.passwordHash) {
        const isMatch = comparePassword(password, user.passwordHash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
      }

      user.lastLoginAt = new Date();
      user.lastLoginIp = clientIp;

      const userJson = { ...user };
      delete userJson.passwordHash;

      const token = jwt.sign({ 
        id: user._id, 
        email: user.email, 
        role: user.role,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, role, token);

      return res.json({ success: true, user: userJson, token });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  const { role } = req.body;
  if (role) {
    const cookieName = role === 'client' ? 'client_session' : 'lawyer_session';
    res.clearCookie(cookieName, { path: '/' });
  } else {
    res.clearCookie('client_session', { path: '/' });
    res.clearCookie('lawyer_session', { path: '/' });
  }
  res.json({ success: true });
});

// Email Verification Handler Route
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const rawToken = req.query.token;
    const clientOrigin = getClientOrigin(req);
    const expectsJson = req.headers.accept?.includes('application/json') || req.query.format === 'json';

    if (!rawToken || typeof rawToken !== 'string') {
      if (expectsJson) {
        return res.status(400).json({ success: false, error: 'Verification token is required' });
      }
      return res.redirect(`${clientOrigin}/client-dashboard?error=missing_token`);
    }

    const cleanToken = rawToken.trim();

    let user = null;
    if (isMongoConnected) {
      user = await User.findOne({ verificationToken: cleanToken });
    } else {
      for (const u of fallbackUsers.values()) {
        if (u.verificationToken === cleanToken) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      if (expectsJson) {
        return res.status(400).json({ success: false, error: 'Invalid or already used verification token' });
      }
      return res.redirect(`${clientOrigin}/client-dashboard?error=invalid_token`);
    }

    // Check 24-hour expiration window
    if (user.verificationTokenExpires && new Date(user.verificationTokenExpires).getTime() < Date.now()) {
      if (expectsJson) {
        return res.status(410).json({ success: false, error: 'Verification token has expired. Please request a new activation link.' });
      }
      return res.redirect(`${clientOrigin}/client-dashboard?error=token_expired&email=${encodeURIComponent(user.email)}`);
    }

    // Activate user account
    if (isMongoConnected) {
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();
    } else {
      user.isVerified = true;
      delete user.verificationToken;
      delete user.verificationTokenExpires;
      fallbackUsers.set(user.email.toLowerCase(), user);
      if (user._id || user.id) {
        fallbackUsers.set(String(user._id || user.id), user);
      }
    }

    const userJson = user.toObject ? user.toObject() : { ...user };
    delete userJson.passwordHash;
    delete userJson.verificationToken;

    // Issue refreshed session cookie / token
    const role = userJson.role || 'client';
    const sessionToken = jwt.sign({
      id: (userJson._id || userJson.id).toString(),
      email: userJson.email,
      role,
      name: userJson.name || `${userJson.firstName || ''} ${userJson.lastName || ''}`.trim()
    }, JWT_SECRET, { expiresIn: '7d' });

    setAuthCookie(res, role, sessionToken);

    if (expectsJson) {
      return res.json({
        success: true,
        message: 'Account activation successful',
        user: userJson,
        token: sessionToken
      });
    }

    return res.redirect(`${clientOrigin}/client-dashboard?verified=true`);
  } catch (error) {
    console.error('[-] Email Verification Error:', error);
    const clientOrigin = getClientOrigin(req);
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.status(500).json({ success: false, error: 'Internal server error verifying email' });
    }
    return res.redirect(`${clientOrigin}/client-dashboard?error=server_error`);
  }
});

// Resend Verification Link Endpoint
app.post('/api/auth/resend-verification', authLimiter, optionalAuth, async (req, res) => {
  try {
    const requestedEmail = req.body?.email || req.user?.email || req.clientUser?.email;
    if (!requestedEmail) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = sanitizeText(requestedEmail, 160).toLowerCase().trim();
    let user = null;

    if (isMongoConnected) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      user = fallbackUsers.get(cleanEmail);
    }

    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a fresh activation link has been sent.' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'This account is already activated. You can sign in directly.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (isMongoConnected) {
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      await user.save();
    } else {
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      fallbackUsers.set(cleanEmail, user);
      if (user._id || user.id) fallbackUsers.set(String(user._id || user.id), user);
    }

    const clientOrigin = getClientOrigin(req);
    const publicAppUrl = getPublicAppUrl(req);
    const verificationUrl = `${publicAppUrl}/verify-email?token=${verificationToken}`;
    const localVerificationUrl = `${clientOrigin}/verify-email?token=${verificationToken}`;

    await sendVerificationEmail({
      to: cleanEmail,
      name: user.name || user.firstName || 'Client',
      verificationUrl,
      token: verificationToken
    });

    return res.json({ 
      success: true, 
      message: 'A fresh activation link has been sent to your email address.',
      verificationUrl: process.env.NODE_ENV !== 'production' ? localVerificationUrl : undefined 
    });
  } catch (error) {
    console.error('[-] Resend Verification Error:', error);
    return res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Update Unverified Client Email & Dispatch Fresh Verification Link
app.post('/api/auth/update-email', authLimiter, optionalAuth, async (req, res) => {
  try {
    const currentEmail = (req.body?.currentEmail || req.user?.email || req.clientUser?.email || '').toLowerCase().trim();
    const newEmail = (req.body?.newEmail || '').toLowerCase().trim();

    if (!currentEmail || !newEmail) {
      return res.status(400).json({ error: 'Current email and new email are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Common typo domains rejection
    const typoDomains = ['gmial.com', 'gamil.com', 'gmai.com', 'gmaill.com', 'hotmial.com', 'yaho.com', 'outlok.com'];
    const domain = newEmail.split('@')[1] || '';
    if (typoDomains.includes(domain)) {
      const suggestion = domain.startsWith('gm') ? 'gmail.com' : domain.startsWith('hot') ? 'hotmail.com' : domain.startsWith('ya') ? 'yahoo.com' : 'outlook.com';
      return res.status(400).json({ error: `Please check your email spelling: did you mean @${suggestion}?` });
    }

    let user = null;
    if (isMongoConnected) {
      user = await User.findOne({ email: currentEmail });
      if (!user) {
        return res.status(404).json({ error: 'Account not found with current email' });
      }
      if (newEmail !== currentEmail) {
        const existing = await User.findOne({ email: newEmail });
        if (existing && existing._id.toString() !== user._id.toString()) {
          return res.status(400).json({ error: 'An account with this email address already exists.' });
        }
      }
    } else {
      user = fallbackUsers.get(currentEmail);
      if (!user) {
        return res.status(404).json({ error: 'Account not found' });
      }
      if (fallbackUsers.has(newEmail) && newEmail !== currentEmail) {
        return res.status(400).json({ error: 'An account with this email address already exists.' });
      }
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'This account is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (isMongoConnected) {
      user.email = newEmail;
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      await user.save();
    } else {
      fallbackUsers.delete(currentEmail);
      user.email = newEmail;
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      fallbackUsers.set(newEmail, user);
      if (user._id || user.id) fallbackUsers.set(String(user._id || user.id), user);
    }

    const clientOrigin = getClientOrigin(req);
    const publicAppUrl = getPublicAppUrl(req);
    const verificationUrl = `${publicAppUrl}/verify-email?token=${verificationToken}`;
    const localVerificationUrl = `${clientOrigin}/verify-email?token=${verificationToken}`;

    await sendVerificationEmail({
      to: newEmail,
      name: user.name || user.firstName || 'Client',
      verificationUrl,
      token: verificationToken
    });

    console.log(`[Email] Client email corrected: "${currentEmail}" -> "${newEmail}". Verification email sent.`);

    return res.json({
      success: true,
      message: `Email updated to ${newEmail}. Verification link has been sent!`,
      email: newEmail,
      token: verificationToken,
      verificationUrl: process.env.NODE_ENV !== 'production' ? localVerificationUrl : undefined
    });
  } catch (error) {
    console.error('[-] Update Email Error:', error);
    return res.status(500).json({ error: 'Failed to update email address' });
  }
});

// Development-only token inspection route for automated test verification
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/auth/dev-peek-verification-token', async (req, res) => {
    try {
      const email = (req.query.email || '').toLowerCase().trim();
      if (!email) return res.status(400).json({ error: 'Email required' });

      let token = null;
      let expires = null;

      if (isMongoConnected) {
        const user = await User.findOne({ email });
        if (user) {
          token = user.verificationToken;
          expires = user.verificationTokenExpires;
        }
      } else {
        const user = fallbackUsers.get(email);
        if (user) {
          token = user.verificationToken;
          expires = user.verificationTokenExpires;
        }
      }

      return res.json({ email, token, expires });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
}

// Auth Hydration / Current User
app.get('/api/auth/me', async (req, res) => {
  const clientToken = req.cookies.client_session;
  const lawyerToken = req.cookies.lawyer_session;
  
  let clientUser = null;
  let lawyerUser = null;

  try {
    if (clientToken) {
      try {
        const decoded = jwt.verify(clientToken, JWT_SECRET);
        if (isMongoConnected) {
          if (mongoose.Types.ObjectId.isValid(decoded.id)) {
            clientUser = await User.findById(decoded.id).select('-passwordHash');
          }
          if (!clientUser && decoded.email) {
            clientUser = await User.findOne({ email: decoded.email.toLowerCase(), role: 'client' }).select('-passwordHash');
          }
        }

        if (!clientUser) {
          // Look up in fallbackUsers registry
          const memoryUser = fallbackUsers.get(decoded.id) || (decoded.email ? fallbackUsers.get(decoded.email.toLowerCase()) : null);
          if (memoryUser && (!memoryUser.role || memoryUser.role === 'client')) {
            const sanitized = { ...memoryUser };
            delete sanitized.passwordHash;
            clientUser = sanitized;
          } else if (decoded.email) {
            // Reconstruct accurately from verified JWT claims
            const derivedName = decoded.name || decoded.email.split('@')[0];
            clientUser = {
              _id: decoded.id || 'usr-' + Date.now(),
              email: decoded.email,
              role: 'client',
              name: derivedName,
              firstName: derivedName.split(' ')[0],
              lastName: derivedName.split(' ').slice(1).join(' '),
              onboarded: true
            };
          }
        }
      } catch (tokenErr) {
        console.warn('Invalid client session token:', tokenErr.message);
      }
    }

    if (lawyerToken) {
      try {
        const decoded = jwt.verify(lawyerToken, JWT_SECRET);
        if (isMongoConnected) {
          if (mongoose.Types.ObjectId.isValid(decoded.id)) {
            lawyerUser = await User.findById(decoded.id).select('-passwordHash');
          }
          if (!lawyerUser && decoded.email) {
            lawyerUser = await User.findOne({ email: decoded.email.toLowerCase(), role: 'lawyer' }).select('-passwordHash');
          }
        }

        if (!lawyerUser) {
          const memoryUser = fallbackUsers.get(decoded.id) || (decoded.email ? fallbackUsers.get(decoded.email.toLowerCase()) : null);
          if (memoryUser && (!memoryUser.role || memoryUser.role === 'lawyer')) {
            const sanitized = { ...memoryUser };
            delete sanitized.passwordHash;
            lawyerUser = sanitized;
          } else if (decoded.email) {
            const derivedName = decoded.name || "Attorney";
            lawyerUser = {
              _id: decoded.id || 'lwy-' + Date.now(),
              email: decoded.email,
              role: 'lawyer',
              name: derivedName,
              firmName: "Independent Practice",
              specialty: "General Practice",
              onboarded: true
            };
          }
        }
      } catch (tokenErr) {
        console.warn('Invalid lawyer session token:', tokenErr.message);
      }
    }

    return res.json({ clientUser, lawyerUser });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return res.json({ clientUser: null, lawyerUser: null });
  }
});

// ----------------------------------------------------
// LAWYER DIRECTORY APIs
// ----------------------------------------------------

// Fetch Lawyers with comprehensive filters & sorting
app.get('/api/lawyers', async (req, res) => {
  try {
    const { category, location, freeConsultation, minExperience, search, sort } = req.query;

    if (!isMongoConnected) {
      let filtered = [...INITIAL_LAWYERS].map((l, idx) => ({ ...l, id: `lwy-00${idx + 1}` }));
      if (category) {
        filtered = filtered.filter(l => l.specialty?.toLowerCase().includes(category.toLowerCase()));
      }
      if (location) {
        filtered = filtered.filter(l => l.location?.toLowerCase().includes(location.toLowerCase()));
      }
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filtered = filtered.filter(l => 
          searchRegex.test(l.name) || 
          searchRegex.test(l.firmName) || 
          searchRegex.test(l.specialty) || 
          searchRegex.test(l.bio) || 
          searchRegex.test(l.location)
        );
      }
      if (freeConsultation === 'true') {
        filtered = filtered.filter(l => l.freeConsultation === true);
      }
      if (minExperience && Number(minExperience) > 0) {
        filtered = filtered.filter(l => (l.experienceYears || 0) >= Number(minExperience));
      }
      
      if (sort === 'rating_asc') filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      else if (sort === 'reviews' || sort === 'Most Reviewed') filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      else if (sort === 'name' || sort === 'Name (A-Z)') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      else filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0)); // default rating_desc

      return res.json(filtered);
    }

    const query = { role: 'lawyer' };

    if (category && category !== 'All' && category !== 'all') {
      query.$or = [
        { specialty: new RegExp(category, 'i') },
        { practiceAreas: new RegExp(category, 'i') }
      ];
    }

    if (location) {
      query.location = new RegExp(location, 'i');
    }

    if (freeConsultation === 'true') {
      query.freeConsultation = true;
    }

    if (minExperience && Number(minExperience) > 0) {
      query.experienceYears = { $gte: Number(minExperience) };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { firmName: searchRegex },
        { specialty: searchRegex },
        { bio: searchRegex },
        { location: searchRegex }
      ];
    }

    let sortOption = { rating: -1 };
    if (sort === 'rating_asc') sortOption = { rating: 1 };
    else if (sort === 'reviews' || sort === 'Most Reviewed') sortOption = { reviewCount: -1 };
    else if (sort === 'name' || sort === 'Name (A-Z)') sortOption = { name: 1 };

    const lawyers = await User.find(query).sort(sortOption).select('-passwordHash');

    const formatted = lawyers.map(l => ({
      id: l._id.toString(),
      name: l.name || (l.firstName && l.lastName ? `${l.firstName} ${l.lastName}` : l.firmName || 'Verified Attorney'),
      firm: l.firmName || 'Independent Practice',
      rating: l.rating || 5.0,
      reviewCount: l.reviewCount || 10,
      description: l.bio || l.about || 'A dedicated legal professional ready to assist you.',
      about: l.about || l.bio,
      location: l.location || 'United States',
      imageUrl: l.imageUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&auto=format&fit=crop&q=60',
      specialty: l.specialty || 'General Practice',
      practiceAreas: l.practiceAreas && l.practiceAreas.length > 0 ? l.practiceAreas : [l.specialty || 'General Practice'],
      experienceYears: l.experienceYears || 10,
      hourlyRate: l.hourlyRate ? `$${l.hourlyRate}/hr` : "$350/hr",
      consultationAvailability: l.consultationAvailability || 'Within 24 Hours',
      freeConsultation: l.freeConsultation ?? true,
      languages: l.languages || ['English'],
      isVerified: l.isVerified ?? true
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching directory:', error);
    res.status(500).json({ error: 'Failed to fetch directory' });
  }
});

// Fetch Single Lawyer Profile by ID or Email
app.get('/api/lawyers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      let lawyer = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        lawyer = await User.findById(id).select('-passwordHash');
      }
      if (!lawyer) {
        lawyer = await User.findOne({ email: id, role: 'lawyer' }).select('-passwordHash');
      }

      if (lawyer) {
        return res.json({
          id: lawyer._id.toString(),
          name: lawyer.name || `${lawyer.firstName || ''} ${lawyer.lastName || ''}`.trim() || lawyer.firmName || "Robert H. Pearson",
          firm: lawyer.firmName || "Pearson & Hardman LLP",
          rating: lawyer.rating || 4.9,
          reviewCount: lawyer.reviewCount || 342,
          location: lawyer.location || "New York, NY",
          imageUrl: lawyer.imageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80",
          badges: ["Top Rated", `${lawyer.experienceYears || 20}+ Years Experience`, "Verified Bar Member"],
          about: lawyer.about || lawyer.bio || "Dedicated legal professional with a focus on delivering premier representation.",
          specialty: lawyer.specialty || "Corporate Litigation",
          practiceAreas: lawyer.practiceAreas && lawyer.practiceAreas.length > 0 ? lawyer.practiceAreas : ["Corporate Litigation", "Mergers & Acquisitions"],
          experienceYears: lawyer.experienceYears || 20,
          hourlyRate: lawyer.hourlyRate ? `$${lawyer.hourlyRate}/hr` : "$450/hr",
          freeConsultation: lawyer.freeConsultation ?? true,
          contact: {
            phone: lawyer.phone || "(212) 555-0198",
            email: lawyer.email,
            address: lawyer.location || "100 Wall Street, Suite 4500, New York, NY 10005"
          }
        });
      }
    }

    // Default fallback
    return res.json({
      id,
      name: "Robert H. Pearson",
      firm: "Pearson & Hardman LLP",
      rating: 4.9,
      reviewCount: 342,
      location: "New York, NY",
      imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80",
      badges: ["Top Rated in NY", "20+ Years Experience", "Avvo Superb Rating"],
      about: "Robert H. Pearson is a founding partner at Pearson & Hardman LLP, widely recognized as one of the preeminent corporate litigation attorneys in New York.",
      practiceAreas: ["Corporate Litigation", "Mergers & Acquisitions", "White Collar Defense", "Securities Law"],
      contact: {
        phone: "(212) 555-0198",
        email: "robert.pearson@ph-law.com",
        address: "100 Wall Street, Suite 4500\nNew York, NY 10005"
      }
    });
  } catch (error) {
    console.error('Error fetching lawyer by ID:', error);
    res.status(500).json({ error: 'Failed to fetch lawyer profile' });
  }
});

// Update Lawyer Profile in DB
app.put('/api/lawyers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, firmName, firm, specialty, bio, hourlyRate, location, phone, plan } = req.body;
    const finalFirm = firmName || firm;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (finalFirm) updateFields.firmName = finalFirm;
    if (specialty) updateFields.specialty = specialty;
    if (bio) updateFields.bio = bio;
    if (hourlyRate) updateFields.hourlyRate = hourlyRate;
    if (location) updateFields.location = location;
    if (phone) updateFields.phone = phone;
    if (plan) updateFields.plan = plan;

    if (isMongoConnected) {
      let updatedUser = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        updatedUser = await User.findByIdAndUpdate(
          id,
          { $set: updateFields },
          { new: true }
        ).select('-passwordHash');
      }
      if (!updatedUser) {
        updatedUser = await User.findOneAndUpdate(
          { email: id },
          { $set: updateFields },
          { new: true }
        ).select('-passwordHash');
      }

      return res.json({ success: true, profile: updatedUser });
    }

    return res.json({ success: true, profile: req.body });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Complete Lawyer Onboarding
app.put('/api/lawyers/:id/onboard', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, firmName, specialty, bio, hourlyRate, location, imageUrl } = req.body;

    if (isMongoConnected) {
      const fullName = (firstName && lastName) ? `${firstName} ${lastName}`.trim() : firmName;
      const updated = await User.findByIdAndUpdate(
        id,
        {
          $set: {
            firstName,
            lastName,
            name: fullName,
            firmName,
            specialty,
            bio,
            hourlyRate,
            location,
            imageUrl,
            onboarded: true
          }
        },
        { new: true }
      ).select('-passwordHash');

      return res.json({ success: true, user: updated });
    }

    return res.json({ success: true, user: { ...req.body, onboarded: true } });
  } catch (error) {
    console.error('Error onboarding lawyer:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Lawyer Stats / Analytics
app.get('/api/lawyers/:id/stats', async (req, res) => {
  try {
    const lawyerId = req.params.id;

    if (isMongoConnected) {
      const viewsCount = await ProfileView.countDocuments({ lawyerId });
      const consultations = await Consultation.find({ lawyerId }).select('clientId');
      const messages = await Message.find({ receiverId: lawyerId }).select('senderId');

      const uniqueLeads = new Set([
        ...consultations.map(c => c.clientId),
        ...messages.map(m => m.senderId)
      ]);

      return res.json({
        views: (viewsCount + 120).toLocaleString(),
        viewsTrend: "+14.2%",
        leads: Math.max(uniqueLeads.size, 18).toString(),
        leadsTrend: "+8.5%",
        ranking: "Top 10%",
        rankingTrend: "+2.4%"
      });
    }

    return res.json({
      views: "1,248",
      viewsTrend: "+12.5%",
      leads: "42",
      leadsTrend: "+5.2%",
      ranking: "Top 15%",
      rankingTrend: "-2.1%"
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Profile View Tracking
app.post('/api/lawyers/:id/view', async (req, res) => {
  try {
    if (isMongoConnected) {
      await ProfileView.create({ lawyerId: req.params.id, viewerId: req.body.viewerId || 'anonymous' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// ----------------------------------------------------
// CONSULTATIONS APIs
// ----------------------------------------------------

// Book a Consultation
app.post('/api/consultations', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      lawyerId,
      lawyerName,
      date,
      time,
      topic,
      consultationFee,
      format,
      urgency,
      opposingParty,
      city,
      state,
      zipCode,
      preferredContactMethod,
      smsConsent,
      legalCategory,
      legalSubCategory,
      incidentDate,
      budgetRange,
      caseSummary
    } = req.body;

    if (!clientId || !lawyerId || !date || !time) {
      return res.status(400).json({ error: 'Client, lawyer, date, and time are required' });
    }

    const phoneResult = sanitizePhone(clientPhone);
    const cleanPhone = phoneResult.value;
    const cleanName = sanitizeText(clientName || 'Verified Client', 120);
    const cleanEmail = sanitizeText(clientEmail || 'client@example.com', 160).toLowerCase();
    const cleanOpposingParty = sanitizeText(opposingParty || '', 150);
    const cleanUrgency = normalizeUrgency(urgency || 'this_week');
    const cleanCity = sanitizeText(city || '', 80);
    const cleanState = sanitizeText(state || '', 40);
    const cleanZip = sanitizeZipCode(zipCode || '');
    const cleanContactMethod = normalizeContactMethod(preferredContactMethod || 'email');
    const cleanCategory = sanitizeText(legalCategory || topic || 'General Legal Consultation', 120);
    const cleanSubCategory = sanitizeText(legalSubCategory || '', 120);
    const cleanSummary = sanitizeText(caseSummary || '', 2500, true);
    const cleanBudget = normalizeBudgetRange(budgetRange || 'contingency');

    const meetingFormat = ['zoom', 'phone', 'in_person'].includes(format) ? format : 'zoom';
    const zoomLink = meetingFormat === 'zoom' 
      ? `https://zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}` 
      : (meetingFormat === 'phone' ? `Phone: ${cleanPhone || 'Scheduled Call'}` : 'In-Person / Office Consultation');

    // Generate calendar start time timestamp
    let startTime = new Date();
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      startTime = parsedDate;
      if (typeof time === 'string') {
        const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3]?.toUpperCase();
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          startTime.setHours(hours, minutes, 0, 0);
        }
      }
    } else {
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(14, 0, 0, 0);
    }

    const calendarDetails = {
      title: `Case Consultation: ${sanitizeText(topic || 'Initial Legal Review', 120)} - ${sanitizeText(lawyerName || 'Verified Attorney', 120)}`,
      description: `LawyerComparison Scheduled Case Consultation.\nAttorney: ${lawyerName || 'Verified Attorney'}\nClient: ${cleanName}\nFormat: ${meetingFormat.toUpperCase()}\nDetails: ${zoomLink}${cleanOpposingParty ? `\nOpposing Party (Conflict Check): ${cleanOpposingParty}` : ''}`,
      location: zoomLink,
      startTime
    };

    const googleCalendarUrl = generateGoogleCalendarUrl(calendarDetails);
    const icsContent = generateIcsCalendar(calendarDetails);

    let savedConsultation = null;

    if (isMongoConnected) {
      savedConsultation = await Consultation.create({
        clientId,
        clientName: cleanName,
        clientEmail: cleanEmail,
        clientPhone: cleanPhone,
        clientCity: cleanCity,
        clientState: cleanState,
        clientZipCode: cleanZip,
        preferredContactMethod: cleanContactMethod,
        smsConsent: Boolean(smsConsent),
        lawyerId,
        lawyerName: sanitizeText(lawyerName || "Verified Attorney", 120),
        date,
        time,
        topic: sanitizeText(topic || "Initial Case Consultation", 150),
        consultationFee: consultationFee || 0,
        zoomLink,
        format: meetingFormat,
        legalCategory: cleanCategory,
        legalSubCategory: cleanSubCategory,
        urgency: cleanUrgency,
        incidentDate: sanitizeText(incidentDate || '', 20),
        budgetRange: cleanBudget,
        caseSummary: cleanSummary,
        opposingParty: cleanOpposingParty,
        status: "upcoming"
      });
    } else {
      // In-memory fallback
      savedConsultation = {
        id: "cons-" + Date.now(),
        clientId,
        clientName: cleanName,
        clientEmail: cleanEmail,
        clientPhone: cleanPhone,
        clientCity: cleanCity,
        clientState: cleanState,
        clientZipCode: cleanZip,
        preferredContactMethod: cleanContactMethod,
        smsConsent: Boolean(smsConsent),
        lawyerId,
        lawyerName: sanitizeText(lawyerName || "Verified Attorney", 120),
        date,
        time,
        topic: sanitizeText(topic || "Initial Case Consultation", 150),
        zoomLink,
        format: meetingFormat,
        legalCategory: cleanCategory,
        legalSubCategory: cleanSubCategory,
        urgency: cleanUrgency,
        incidentDate: sanitizeText(incidentDate || '', 20),
        budgetRange: cleanBudget,
        caseSummary: cleanSummary,
        opposingParty: cleanOpposingParty,
        status: "upcoming",
        createdAt: new Date()
      };
      fallbackConsultations.unshift(savedConsultation);
    }

    // Dispatch confirmation email with .ics attachment
    if (cleanEmail) {
      sendTransactionalEmail({
        to: cleanEmail,
        subject: `Consultation Confirmed: ${topic || 'Legal Consultation'} with ${lawyerName || 'Attorney'}`,
        html: `<h2>Your Consultation is Confirmed</h2><p>You are scheduled to meet with <strong>${lawyerName || 'Attorney'}</strong> on <strong>${date} at ${time}</strong>.</p><p><strong>Format:</strong> ${meetingFormat.toUpperCase()}</p><p><strong>Details / Location:</strong> ${zoomLink}</p><p><a href="${googleCalendarUrl}">Add to Google Calendar</a></p>`,
        icsContent,
        attachmentName: 'consultation.ics'
      }).catch(err => console.error('[Notification Dispatch Error]:', err));
    }

    return res.status(201).json({
      success: true,
      consultation: savedConsultation,
      googleCalendarUrl,
      zoomLink
    });
  } catch (error) {
    console.error('Error booking consultation:', error);
    res.status(500).json({ error: 'Failed to book consultation' });
  }
});

// Fetch Consultations for Client or Lawyer
app.get('/api/consultations/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Authorization: User can only query their own consultations
    if (!isAuthorizedAccount(req, userId)) {
      return res.status(403).json({ error: 'Forbidden: You cannot access consultations belonging to another user' });
    }

    if (isMongoConnected) {
      const consultations = await Consultation.find({
        $or: [{ clientId: userId }, { lawyerId: userId }]
      }).sort({ createdAt: -1 });

      return res.json(consultations.map(c => ({
        id: c._id.toString(),
        clientId: c.clientId,
        clientName: c.clientName,
        clientEmail: c.clientEmail,
        clientPhone: c.clientPhone,
        lawyerId: c.lawyerId,
        lawyerName: c.lawyerName,
        topic: c.topic,
        date: c.date,
        time: c.time,
        zoomLink: c.zoomLink,
        format: c.format || 'zoom',
        urgency: c.urgency,
        opposingParty: c.opposingParty,
        status: c.status
      })));
    }

    const memMatches = fallbackConsultations.filter(c => c.clientId === userId || c.lawyerId === userId);
    return res.json(memMatches);
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({ error: 'Failed to fetch consultations' });
  }
});

// ----------------------------------------------------
// CONTACT & INQUIRIES APIs
// ----------------------------------------------------

// Submit Contact Inquiry
app.post('/api/inquiries', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const { lawyerId, lawyerName, fullName, email, phone, issue, subCategory, legalSubCategory, description, caseSummary, urgency, preferredContactMethod, opposingParty, smsConsent, city, state, zipCode, incidentDate, budgetRange, attachments } = req.body;
    
    const cleanFullName = sanitizeText(fullName, 120);
    const cleanEmail = sanitizeText(email, 160).toLowerCase();
    const cleanIssue = sanitizeText(issue, 120);
    const cleanDescription = sanitizeText(description || caseSummary, 2500, true);

    if (!cleanFullName || !cleanEmail || !cleanIssue || !cleanDescription) {
      return res.status(400).json({ error: 'Full name, email, legal issue, and summary description are required' });
    }

    const onboardingSanitized = sanitizeOnboardingData({
      phone,
      smsConsent,
      city,
      state,
      zipCode,
      preferredContactMethod,
      legalCategory: cleanIssue,
      legalSubCategory: legalSubCategory || subCategory,
      urgency,
      incidentDate,
      opposingParty,
      budgetRange,
      notes: cleanDescription,
      attachments
    });

    if (onboardingSanitized.error) {
      return res.status(400).json({ error: onboardingSanitized.error });
    }

    const clientId = req.clientUser?.id || (req.user?.role === 'client' ? req.user.id : sanitizeText(req.body.clientId, 80)) || cleanEmail;
    let savedInquiry = null;

    if (isMongoConnected) {
      savedInquiry = await Inquiry.create({
        lawyerId: sanitizeText(lawyerId || 'general', 100),
        lawyerName: sanitizeText(lawyerName || 'Directory Administration', 120),
        clientId,
        fullName: cleanFullName,
        email: cleanEmail,
        phone: onboardingSanitized.contact.phone,
        smsConsent: onboardingSanitized.contact.smsConsent,
        city: onboardingSanitized.contact.city,
        state: onboardingSanitized.contact.state,
        zipCode: onboardingSanitized.contact.zipCode,
        preferredContactMethod: onboardingSanitized.contact.preferredContactMethod,
        issue: cleanIssue,
        subCategory: onboardingSanitized.caseProfile.legalSubCategory,
        urgency: onboardingSanitized.caseProfile.urgency,
        incidentDate: onboardingSanitized.caseProfile.incidentDate,
        opposingParty: onboardingSanitized.caseProfile.opposingParty,
        budgetRange: onboardingSanitized.caseProfile.budgetRange,
        description: cleanDescription,
        attachments: onboardingSanitized.caseProfile.attachments,
        source: 'direct_inquiry',
        conflictStatus: 'pending',
        status: 'new'
      });

      // Also create an initial message thread so lawyer can see it in Client Inbox!
      if (lawyerId && lawyerId !== 'general' && lawyerId !== 'support') {
        const roomId = [String(cleanEmail), String(lawyerId)].sort().join('_');
        const conflictNote = onboardingSanitized.caseProfile.opposingParty
          ? ` | Opposing Party: ${onboardingSanitized.caseProfile.opposingParty}`
          : '';
        await Message.create({
          roomId,
          senderId: cleanEmail,
          receiverId: lawyerId,
          text: `[New Inquiry - ${cleanIssue}${onboardingSanitized.caseProfile.legalSubCategory ? ` / ${onboardingSanitized.caseProfile.legalSubCategory}` : ''} | Urgency: ${onboardingSanitized.caseProfile.urgency} | Preferred: ${onboardingSanitized.contact.preferredContactMethod}${conflictNote}]: ${cleanDescription} (Contact: ${cleanFullName}, ${onboardingSanitized.contact.phone || cleanEmail})`,
          timestamp: new Date()
        });
      }
    } else {
      const memId = 'inq-' + Date.now();
      savedInquiry = {
        id: memId,
        _id: memId,
        lawyerId: sanitizeText(lawyerId || 'general', 100),
        lawyerName: sanitizeText(lawyerName || 'Directory Administration', 120),
        clientId,
        fullName: cleanFullName,
        email: cleanEmail,
        phone: onboardingSanitized.contact.phone,
        smsConsent: onboardingSanitized.contact.smsConsent,
        city: onboardingSanitized.contact.city,
        state: onboardingSanitized.contact.state,
        zipCode: onboardingSanitized.contact.zipCode,
        preferredContactMethod: onboardingSanitized.contact.preferredContactMethod,
        issue: cleanIssue,
        subCategory: onboardingSanitized.caseProfile.legalSubCategory,
        urgency: onboardingSanitized.caseProfile.urgency,
        incidentDate: onboardingSanitized.caseProfile.incidentDate,
        opposingParty: onboardingSanitized.caseProfile.opposingParty,
        budgetRange: onboardingSanitized.caseProfile.budgetRange,
        description: cleanDescription,
        attachments: onboardingSanitized.caseProfile.attachments,
        source: 'direct_inquiry',
        conflictStatus: 'pending',
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      fallbackInquiries.unshift(savedInquiry);

      if (lawyerId && lawyerId !== 'general' && lawyerId !== 'support') {
        const roomId = [String(cleanEmail), String(lawyerId)].sort().join('_');
        fallbackMessages.push({
          id: 'msg-' + Date.now(),
          roomId,
          senderId: cleanEmail,
          receiverId: lawyerId,
          text: `[New Inquiry - ${cleanIssue} | Urgency: ${onboardingSanitized.caseProfile.urgency} | Preferred: ${onboardingSanitized.contact.preferredContactMethod}]: ${cleanDescription}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Send transactional lead alert email
    sendTransactionalEmail({
      to: 'inquiries@lawyercomparison.com',
      subject: `New Case Lead: ${cleanIssue} from ${cleanFullName} [Urgency: ${onboardingSanitized.caseProfile.urgency}]`,
      html: `<h2>New Case Inquiry</h2>
        <p><strong>Client:</strong> ${cleanFullName} (${cleanEmail}, ${onboardingSanitized.contact.phone || 'N/A'})</p>
        <p><strong>Location:</strong> ${onboardingSanitized.contact.location}</p>
        <p><strong>Target Attorney:</strong> ${lawyerName || 'Directory'}</p>
        <p><strong>Issue:</strong> ${cleanIssue}${onboardingSanitized.caseProfile.legalSubCategory ? ` — ${onboardingSanitized.caseProfile.legalSubCategory}` : ''}</p>
        <p><strong>Urgency:</strong> ${onboardingSanitized.caseProfile.urgency}</p>
        <p><strong>Budget Range:</strong> ${onboardingSanitized.caseProfile.budgetRange}</p>
        <p><strong>Preferred Contact Method:</strong> ${onboardingSanitized.contact.preferredContactMethod} (SMS Consent: ${onboardingSanitized.contact.smsConsent ? 'Yes' : 'No'})</p>
        ${onboardingSanitized.caseProfile.opposingParty ? `<p><strong>Opposing Party (Conflict Check):</strong> ${onboardingSanitized.caseProfile.opposingParty}</p>` : ''}
        <p><strong>Description:</strong> ${cleanDescription}</p>`
    }).catch(err => console.error('[Inquiry Lead Alert Error]:', err));

    return res.status(201).json({ success: true, inquiry: savedInquiry });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    res.status(500).json({ error: 'Failed to send inquiry' });
  }
});

// Attorney Review Dashboard: Fetch Client Intakes, Conflict Screening & Consultations
app.get('/api/lawyers/:id/inquiries', authenticate, requireRole('lawyer'), async (req, res) => {
  try {
    const lawyerParam = req.params.id;
    if (!isAuthorizedAccount(req, lawyerParam)) {
      return res.status(403).json({ error: 'Forbidden: You can only view intake dossiers assigned to your practice' });
    }

    const lawyerEmail = (req.user?.email || '').toLowerCase().trim();
    const lawyerIds = [lawyerParam, req.user?.id, lawyerEmail].filter(Boolean);

    let inquiryDocs = [];
    let consultationDocs = [];
    let clientUsersMap = new Map();

    if (isMongoConnected) {
      inquiryDocs = await Inquiry.find({
        $or: [
          { lawyerId: { $in: lawyerIds } },
          { lawyerId: 'general' }
        ]
      }).sort({ createdAt: -1 }).lean();

      consultationDocs = await Consultation.find({
        lawyerId: { $in: lawyerIds }
      }).sort({ createdAt: -1 }).lean();

      const clientLookupIds = [
        ...inquiryDocs.map(i => i.clientId).filter(id => id && mongoose.Types.ObjectId.isValid(id)),
        ...consultationDocs.map(c => c.clientId).filter(id => id && mongoose.Types.ObjectId.isValid(id))
      ];
      const clientLookupEmails = [
        ...inquiryDocs.map(i => i.email).filter(Boolean),
        ...consultationDocs.map(c => c.clientEmail).filter(Boolean)
      ];

      if (clientLookupIds.length > 0 || clientLookupEmails.length > 0) {
        const matchedUsers = await User.find({
          role: 'client',
          $or: [
            ...(clientLookupIds.length ? [{ _id: { $in: clientLookupIds } }] : []),
            ...(clientLookupEmails.length ? [{ email: { $in: clientLookupEmails } }] : [])
          ]
        }).select('-passwordHash').lean();

        matchedUsers.forEach(u => {
          clientUsersMap.set(u._id.toString(), u);
          if (u.email) clientUsersMap.set(u.email.toLowerCase(), u);
        });
      }
    } else {
      inquiryDocs = fallbackInquiries.filter(
        i => lawyerIds.includes(i.lawyerId) || i.lawyerId === 'general'
      );
      consultationDocs = fallbackConsultations.filter(c => lawyerIds.includes(c.lawyerId));
      for (const [k, u] of fallbackUsers.entries()) {
        if (u && u.role === 'client') {
          clientUsersMap.set(k, u);
        }
      }
    }

    // Format Inquiry items cleanly
    const formattedInquiries = inquiryDocs.map(inq => {
      const linkedUser = clientUsersMap.get(inq.clientId) || clientUsersMap.get((inq.email || '').toLowerCase());
      const profile = linkedUser?.caseProfile || {};
      const city = inq.city || linkedUser?.city || profile.city || '';
      const state = inq.state || linkedUser?.state || profile.state || '';
      const zipCode = inq.zipCode || linkedUser?.zipCode || profile.zipCode || '';
      const locationStr = [city, state].filter(Boolean).join(', ') + (zipCode ? ` ${zipCode}` : '');

      return {
        id: (inq._id || inq.id).toString(),
        recordType: 'inquiry',
        source: inq.source || 'direct_inquiry',
        lawyerId: inq.lawyerId,
        lawyerName: inq.lawyerName || 'Matched Attorneys',
        clientId: inq.clientId || inq.email,
        fullName: inq.fullName || linkedUser?.name || 'Client',
        email: inq.email || linkedUser?.email || '',
        phone: inq.phone || linkedUser?.phone || '',
        smsConsent: inq.smsConsent ?? linkedUser?.smsConsent ?? profile.smsNotifications ?? false,
        city,
        state,
        zipCode,
        location: locationStr.trim() || linkedUser?.location || 'Location Pending',
        preferredContactMethod: inq.preferredContactMethod || linkedUser?.preferredContactMethod || profile.preferredContactMethod || 'email',
        issue: inq.issue || profile.legalCategory || 'General Practice',
        subCategory: inq.subCategory || profile.legalSubCategory || '',
        urgency: normalizeUrgency(inq.urgency || profile.urgency || 'this_week'),
        incidentDate: inq.incidentDate || profile.incidentDate || '',
        opposingParty: inq.opposingParty || profile.opposingParty || '',
        budgetRange: normalizeBudgetRange(inq.budgetRange || profile.budgetRange || 'contingency'),
        description: inq.description || profile.notes || '',
        attachments: (inq.attachments && inq.attachments.length > 0) ? inq.attachments : (profile.attachments || []),
        conflictStatus: inq.conflictStatus || 'pending',
        status: inq.status || 'new',
        createdAt: inq.createdAt || new Date()
      };
    });

    // Also include booked Consultations enriched with client dossier details
    const formattedConsultations = consultationDocs.map(c => {
      const linkedUser = clientUsersMap.get(c.clientId) || clientUsersMap.get((c.clientEmail || '').toLowerCase());
      const profile = linkedUser?.caseProfile || {};
      const city = c.clientCity || linkedUser?.city || profile.city || '';
      const state = c.clientState || linkedUser?.state || profile.state || '';
      const zipCode = c.clientZipCode || linkedUser?.zipCode || profile.zipCode || '';
      const locationStr = [city, state].filter(Boolean).join(', ') + (zipCode ? ` ${zipCode}` : '');

      return {
        id: (c._id || c.id).toString(),
        recordType: 'consultation',
        source: 'consultation',
        lawyerId: c.lawyerId,
        lawyerName: c.lawyerName,
        clientId: c.clientId,
        fullName: c.clientName || linkedUser?.name || 'Client',
        email: c.clientEmail || linkedUser?.email || '',
        phone: c.clientPhone || linkedUser?.phone || '',
        smsConsent: c.smsConsent ?? linkedUser?.smsConsent ?? profile.smsNotifications ?? false,
        city,
        state,
        zipCode,
        location: locationStr.trim() || linkedUser?.location || 'Location Pending',
        preferredContactMethod: c.preferredContactMethod || linkedUser?.preferredContactMethod || profile.preferredContactMethod || 'email',
        issue: c.legalCategory || profile.legalCategory || c.topic || 'Legal Consultation',
        subCategory: c.legalSubCategory || profile.legalSubCategory || '',
        urgency: normalizeUrgency(c.urgency || profile.urgency || 'this_week'),
        incidentDate: c.incidentDate || profile.incidentDate || '',
        opposingParty: c.opposingParty || profile.opposingParty || '',
        budgetRange: normalizeBudgetRange(c.budgetRange || profile.budgetRange || 'contingency'),
        description: c.caseSummary || profile.notes || `Scheduled Consultation: ${c.topic} (${c.date} at ${c.time})`,
        attachments: profile.attachments || [],
        conflictStatus: 'pending',
        status: c.status === 'completed' ? 'closed' : 'new',
        consultationDate: c.date,
        consultationTime: c.time,
        meetingFormat: c.format || 'zoom',
        createdAt: c.createdAt || new Date()
      };
    });

    const combined = [...formattedInquiries, ...formattedConsultations];
    const urgencyWeight = { immediate: 0, this_week: 1, exploratory: 2 };
    combined.sort((a, b) => {
      const ua = urgencyWeight[a.urgency] ?? 1;
      const ub = urgencyWeight[b.urgency] ?? 1;
      if (ua !== ub) return ua - ub;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.json({
      success: true,
      inquiries: combined,
      summary: {
        total: combined.length,
        immediateCount: combined.filter(i => i.urgency === 'immediate').length,
        conflictPendingCount: combined.filter(i => i.opposingParty && i.conflictStatus === 'pending').length,
        attachmentCount: combined.reduce((acc, i) => acc + (i.attachments?.length || 0), 0)
      }
    });
  } catch (err) {
    console.error('Error fetching attorney inquiries:', err);
    res.status(500).json({ error: 'Failed to load client intake reviews' });
  }
});

// Update Inquiry / Conflict Screening Review Status
app.patch('/api/inquiries/:id/status', authenticate, requireRole('lawyer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, conflictStatus } = req.body;

    const validStatuses = ['new', 'reviewed', 'conflict_cleared', 'contacted', 'closed'];
    const validConflictStatuses = ['pending', 'cleared', 'conflict_found'];

    const updatePayload = {};
    if (status && validStatuses.includes(status)) {
      updatePayload.status = status;
      if (status === 'conflict_cleared' && !conflictStatus) {
        updatePayload.conflictStatus = 'cleared';
      }
    }
    if (conflictStatus && validConflictStatuses.includes(conflictStatus)) {
      updatePayload.conflictStatus = conflictStatus;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'Valid status or conflictStatus required' });
    }

    if (isMongoConnected && mongoose.Types.ObjectId.isValid(id)) {
      const updated = await Inquiry.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });
      if (!updated) {
        return res.status(404).json({ error: 'Inquiry record not found' });
      }
      return res.json({ success: true, inquiry: updated });
    }

    const memMatch = fallbackInquiries.find(i => (i.id === id || i._id === id));
    if (memMatch) {
      Object.assign(memMatch, updatePayload, { updatedAt: new Date() });
      return res.json({ success: true, inquiry: memMatch });
    }

    return res.json({ success: true, inquiry: { id, ...updatePayload } });
  } catch (err) {
    console.error('Error updating inquiry status:', err);
    res.status(500).json({ error: 'Failed to update inquiry review status' });
  }
});

// ----------------------------------------------------
// SAVED ATTORNEYS APIs
// ----------------------------------------------------

app.post('/api/clients/:id/saved-attorneys', authenticate, async (req, res) => {
  try {
    const clientId = req.params.id;

    // Authorization: User can only modify their own saved attorneys
    if (!isAuthorizedAccount(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify saved attorneys belonging to another client' });
    }

    const { lawyerId } = req.body;
    if (!lawyerId) {
      return res.status(400).json({ error: 'lawyerId is required' });
    }

    if (!isMongoConnected) {
      if (!fallbackSavedAttorneys[clientId]) {
        fallbackSavedAttorneys[clientId] = new Set();
      }
      if (fallbackSavedAttorneys[clientId].has(lawyerId)) {
        fallbackSavedAttorneys[clientId].delete(lawyerId);
        return res.json({ success: true, saved: false });
      } else {
        fallbackSavedAttorneys[clientId].add(lawyerId);
        return res.json({ success: true, saved: true });
      }
    }

    const existing = await SavedAttorney.findOne({ clientId, lawyerId });
    if (existing) {
      await SavedAttorney.deleteOne({ _id: existing._id });
      res.json({ success: true, saved: false });
    } else {
      await SavedAttorney.create({ clientId, lawyerId });
      res.json({ success: true, saved: true });
    }
  } catch (err) {
    console.error('Error saving attorney:', err);
    res.status(500).json({ error: 'Failed to toggle save' });
  }
});

app.get('/api/clients/:id/saved-attorneys', authenticate, async (req, res) => {
  try {
    const clientId = req.params.id;

    // Authorization: User can only access their own saved attorneys
    if (!isAuthorizedAccount(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden: You cannot access saved attorneys belonging to another client' });
    }
    
    if (!isMongoConnected) {
      const savedSet = fallbackSavedAttorneys[clientId] || new Set();
      const mapped = Array.from(savedSet).map(lawyerId => {
        // Find lawyer in mock data by parsing ID
        let matched = INITIAL_LAWYERS[0];
        if (lawyerId.startsWith('lwy-00')) {
          const idx = parseInt(lawyerId.replace('lwy-00', '')) - 1;
          if (INITIAL_LAWYERS[idx]) matched = INITIAL_LAWYERS[idx];
        }
        
        return {
          _id: `saved-${lawyerId}`,
          lawyerId: {
            _id: lawyerId,
            name: matched.name || matched.firmName || "Verified Attorney",
            firmName: matched.firmName || "Independent Practice",
            specialty: matched.specialty || "General Practice",
            hourlyRate: matched.hourlyRate || "350",
            location: matched.location || "United States",
            imageUrl: matched.imageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60"
          }
        };
      });
      return res.json(mapped);
    }

    const savedRecords = await SavedAttorney.find({ clientId });
    const lawyerIds = savedRecords.map(s => s.lawyerId);

    // Fetch lawyer users
    const lawyers = await User.find({
      $or: [
        { _id: { $in: lawyerIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
        { email: { $in: lawyerIds } }
      ]
    }).select('-passwordHash');

    const mapped = savedRecords.map(record => {
      const matched = lawyers.find(l => l._id.toString() === record.lawyerId || l.email === record.lawyerId);
      return {
        _id: record._id,
        lawyerId: {
          _id: record.lawyerId,
          name: matched ? (matched.name || matched.firmName) : "Verified Attorney",
          firmName: matched?.firmName || "Independent Practice",
          specialty: matched?.specialty || "General Practice",
          hourlyRate: matched?.hourlyRate || "350",
          location: matched?.location || "United States",
          imageUrl: matched?.imageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60"
        }
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error('Error fetching saved:', err);
    res.status(500).json({ error: 'Failed to fetch saved' });
  }
});

// ----------------------------------------------------
// CLIENT CASE PROFILE & INTAKE DOSSIER APIs
// ----------------------------------------------------

app.get('/api/clients/:id/case-profile', authenticate, async (req, res) => {
  try {
    const clientId = req.params.id;

    // Authorization: User can only access their own case profile
    if (!isAuthorizedAccount(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden: You cannot access case profile belonging to another client' });
    }

    if (!isMongoConnected) {
      const memUser = fallbackUsers.get(clientId) || fallbackUsers.get(clientId.toLowerCase()) || fallbackUsers.get(req.clientUser?.email || '');
      const memCase = memUser?.caseProfile || {};
      return res.json({
        success: true,
        contact: {
          phone: memUser?.phone || '',
          smsConsent: memUser?.smsConsent ?? memCase.smsNotifications ?? false,
          city: memUser?.city || memCase.city || '',
          state: memUser?.state || memCase.state || '',
          zipCode: memUser?.zipCode || memCase.zipCode || '',
          location: memUser?.location || '',
          preferredContactMethod: memUser?.preferredContactMethod || memCase.preferredContactMethod || 'email'
        },
        caseProfile: {
          legalCategory: memCase.legalCategory || "Personal Injury & Accidents",
          legalSubCategory: memCase.legalSubCategory || "",
          urgency: normalizeUrgency(memCase.urgency || "this_week"),
          incidentDate: memCase.incidentDate || "",
          opposingParty: memCase.opposingParty || "",
          budgetRange: normalizeBudgetRange(memCase.budgetRange || "contingency"),
          preferredFormat: memCase.preferredFormat || "zoom",
          preferredContactMethod: memCase.preferredContactMethod || memUser?.preferredContactMethod || "email",
          smsNotifications: memCase.smsNotifications ?? memUser?.smsConsent ?? false,
          city: memCase.city || memUser?.city || "",
          state: memCase.state || memUser?.state || "",
          zipCode: memCase.zipCode || memUser?.zipCode || "",
          notes: memCase.notes || "",
          attachments: memCase.attachments || []
        }
      });
    }

    let user = null;
    if (mongoose.Types.ObjectId.isValid(clientId)) {
      user = await User.findById(clientId).select('caseProfile email firstName lastName phone smsConsent city state zipCode location preferredContactMethod');
    }
    if (!user) {
      user = await User.findOne({ email: clientId.toLowerCase() }).select('caseProfile email firstName lastName phone smsConsent city state zipCode location preferredContactMethod');
    }

    if (!user) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const cp = user.caseProfile || {};
    return res.json({
      success: true,
      contact: {
        phone: user.phone || '',
        smsConsent: user.smsConsent ?? cp.smsNotifications ?? false,
        city: user.city || cp.city || '',
        state: user.state || cp.state || '',
        zipCode: user.zipCode || cp.zipCode || '',
        location: user.location || '',
        preferredContactMethod: user.preferredContactMethod || cp.preferredContactMethod || 'email'
      },
      caseProfile: {
        ...cp,
        city: cp.city || user.city || '',
        state: cp.state || user.state || '',
        zipCode: cp.zipCode || user.zipCode || '',
        preferredContactMethod: cp.preferredContactMethod || user.preferredContactMethod || 'email',
        smsNotifications: cp.smsNotifications ?? user.smsConsent ?? false,
        attachments: cp.attachments || []
      }
    });
  } catch (err) {
    console.error('Error fetching case profile:', err);
    res.status(500).json({ error: 'Failed to fetch case profile' });
  }
});

app.put('/api/clients/:id/case-profile', authenticate, async (req, res) => {
  try {
    const clientId = req.params.id;

    // Authorization: User can only update their own case profile
    if (!isAuthorizedAccount(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden: You cannot update case profile belonging to another client' });
    }

    const sanitized = sanitizeOnboardingData(req.body);
    if (sanitized.error) {
      return res.status(400).json({ error: sanitized.error });
    }

    const { contact, caseProfile } = sanitized;

    const updateSet = {
      caseProfile,
      smsConsent: contact.smsConsent,
      preferredContactMethod: contact.preferredContactMethod,
    };
    if (req.body.phone !== undefined) updateSet.phone = contact.phone;
    if (req.body.city !== undefined) updateSet.city = contact.city;
    if (req.body.state !== undefined) updateSet.state = contact.state;
    if (req.body.zipCode !== undefined) updateSet.zipCode = contact.zipCode;
    if (contact.city || contact.state || contact.zipCode) updateSet.location = contact.location;

    if (!isMongoConnected) {
      let memUser = fallbackUsers.get(clientId) || fallbackUsers.get(clientId.toLowerCase()) || fallbackUsers.get(req.clientUser?.email || '');
      if (memUser) {
        Object.assign(memUser, updateSet, { updatedAt: new Date() });
        fallbackUsers.set(memUser.email.toLowerCase(), memUser);
        if (memUser._id) fallbackUsers.set(memUser._id, memUser);
      }

      const emailKey = memUser?.email || req.clientUser?.email || req.user?.email || clientId;
      const fullNameKey = memUser?.name || req.user?.name || 'Client';
      await syncOnboardingInquiry({
        userId: memUser?._id || clientId,
        fullName: fullNameKey,
        email: emailKey,
        contact: {
          ...contact,
          phone: contact.phone || memUser?.phone || ''
        },
        caseProfile
      });

      return res.json({
        success: true,
        message: 'Case profile updated (in-memory mode)',
        contact,
        caseProfile
      });
    }

    let updatedUser = null;
    if (mongoose.Types.ObjectId.isValid(clientId)) {
      updatedUser = await User.findByIdAndUpdate(
        clientId,
        { $set: updateSet },
        { new: true }
      ).select('-passwordHash');
    }
    if (!updatedUser) {
      updatedUser = await User.findOneAndUpdate(
        { email: clientId.toLowerCase() },
        { $set: updateSet },
        { new: true }
      ).select('-passwordHash');
    }

    if (!updatedUser) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const userJson = updatedUser.toObject();
    fallbackUsers.set(updatedUser.email.toLowerCase(), userJson);
    fallbackUsers.set(updatedUser._id.toString(), userJson);

    await syncOnboardingInquiry({
      userId: updatedUser._id.toString(),
      fullName: updatedUser.name || `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || 'Client',
      email: updatedUser.email,
      contact: {
        phone: updatedUser.phone || contact.phone,
        smsConsent: updatedUser.smsConsent,
        city: updatedUser.city,
        state: updatedUser.state,
        zipCode: updatedUser.zipCode,
        location: updatedUser.location,
        preferredContactMethod: updatedUser.preferredContactMethod
      },
      caseProfile: updatedUser.caseProfile
    });

    return res.json({
      success: true,
      message: 'Case profile successfully updated',
      contact: {
        phone: updatedUser.phone,
        smsConsent: updatedUser.smsConsent,
        city: updatedUser.city,
        state: updatedUser.state,
        zipCode: updatedUser.zipCode,
        location: updatedUser.location,
        preferredContactMethod: updatedUser.preferredContactMethod
      },
      caseProfile: updatedUser.caseProfile
    });
  } catch (err) {
    console.error('Error updating case profile:', err);
    res.status(500).json({ error: 'Failed to update case profile' });
  }
});

// ----------------------------------------------------
// LEGAL Q&A ENGINE APIs
// ----------------------------------------------------

app.post('/api/qa/questions', async (req, res) => {
  try {
    const { clientId, clientName, title, content, category, location } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required' });
    }

    if (isMongoConnected) {
      const question = await Question.create({
        clientId: clientId || 'anonymous',
        clientName: clientName || 'Verified Client',
        title,
        content,
        category,
        location: location || 'United States',
        status: 'open'
      });
      return res.status(201).json({ success: true, question });
    }

    return res.status(201).json({ success: true, question: req.body });
  } catch (err) {
    console.error('Error posting question:', err);
    res.status(500).json({ error: 'Failed to post question' });
  }
});

app.get('/api/qa/questions', async (req, res) => {
  try {
    const filter = req.query.category && req.query.category !== 'All' ? { category: req.query.category } : {};

    if (isMongoConnected) {
      const questions = await Question.find(filter).sort({ createdAt: -1 }).lean();
      for (let q of questions) {
        q.answers = await Answer.find({ questionId: q._id.toString() });
      }
      return res.json(questions);
    }

    return res.json([]);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

app.get('/api/qa/questions/unanswered', async (req, res) => {
  try {
    if (isMongoConnected) {
      const questions = await Question.find({ status: 'open' }).sort({ createdAt: -1 });
      return res.json(questions);
    }
    return res.json([]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unanswered questions' });
  }
});

app.get('/api/qa/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected && mongoose.Types.ObjectId.isValid(id)) {
      const question = await Question.findById(id).lean();
      if (question) {
        question.answers = await Answer.find({ questionId: id });
        return res.json(question);
      }
    }
    res.status(404).json({ error: 'Question not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

app.post('/api/qa/answers', async (req, res) => {
  try {
    const { questionId, lawyerId, content } = req.body;

    if (!questionId || !content) {
      return res.status(400).json({ error: 'Question ID and content required' });
    }

    if (isMongoConnected) {
      let lawyer = null;
      if (mongoose.Types.ObjectId.isValid(lawyerId)) {
        lawyer = await User.findById(lawyerId);
      }
      if (!lawyer) {
        lawyer = await User.findOne({ email: lawyerId });
      }

      const answer = await Answer.create({
        questionId,
        lawyerId,
        lawyerName: lawyer?.name || lawyer?.firmName || "Verified Attorney",
        lawyerFirm: lawyer?.firmName || "Independent Practice",
        lawyerSpecialty: lawyer?.specialty || "Legal Specialist",
        lawyerImage: lawyer?.imageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60",
        content,
        upvotes: 0
      });

      await Question.findByIdAndUpdate(questionId, { status: 'answered' });
      return res.status(201).json({ success: true, answer });
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error posting answer:', err);
    res.status(500).json({ error: 'Failed to post answer' });
  }
});

app.put('/api/qa/answers/:id/upvote', async (req, res) => {
  try {
    if (isMongoConnected && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const answer = await Answer.findByIdAndUpdate(req.params.id, { $inc: { upvotes: 1 } }, { new: true });
      return res.json({ success: true, answer });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

// ----------------------------------------------------
// CHAT MESSAGING & CONVERSATIONS APIs
// ----------------------------------------------------

app.get('/api/messages/:roomId', async (req, res) => {
  try {
    if (isMongoConnected) {
      const messages = await Message.find({ roomId: req.params.roomId }).sort({ timestamp: 1 });
      return res.json(messages.map(msg => ({
        id: msg._id.toString(),
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        text: msg.text,
        timestamp: msg.timestamp.toISOString(),
      })));
    } else {
      const messages = fallbackMessages
        .filter(m => m.roomId === req.params.roomId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return res.json(messages);
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/lawyer/:id/conversations', async (req, res) => {
  try {
    const lawyerId = req.params.id;
    let messages = [];

    if (isMongoConnected) {
      messages = await Message.find({ $or: [{ senderId: lawyerId }, { receiverId: lawyerId }] }).sort({ timestamp: -1 });
    } else {
      messages = fallbackMessages.filter(m => m.senderId === lawyerId || m.receiverId === lawyerId).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    const clientsMap = new Map();
    messages.forEach(msg => {
      const clientId = msg.senderId === lawyerId ? msg.receiverId : msg.senderId;
      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          id: clientId,
          name: clientId.includes('@') ? clientId.split('@')[0] : "Client",
          lastMsg: msg.text,
          time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: false
        });
      }
    });

    return res.json(Array.from(clientsMap.values()));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Update User Account Details
app.put('/api/users/:email', authenticate, async (req, res) => {
  try {
    const targetEmail = (req.params.email || '').toLowerCase().trim();

    // Authorization: User can only update their own profile
    if (!targetEmail || !isAuthorizedAccount(req, targetEmail)) {
      return res.status(403).json({ error: 'Forbidden: You can only update your own profile details' });
    }

    const { firstName, lastName, phone, city, state, zipCode, preferredContactMethod, smsConsent } = req.body;

    // Strict validation & sanitization
    const sanitizedFirstName = typeof firstName === 'string' ? sanitizeText(firstName, 50) : undefined;
    const sanitizedLastName = typeof lastName === 'string' ? sanitizeText(lastName, 50) : undefined;

    let sanitizedPhone = undefined;
    if (typeof phone === 'string') {
      const phoneCheck = sanitizePhone(phone);
      if (!phoneCheck.valid) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      sanitizedPhone = phoneCheck.value;
    }

    const updateFields = {};
    if (sanitizedFirstName !== undefined) updateFields.firstName = sanitizedFirstName;
    if (sanitizedLastName !== undefined) updateFields.lastName = sanitizedLastName;
    if (sanitizedFirstName !== undefined || sanitizedLastName !== undefined) {
      updateFields.name = `${sanitizedFirstName || ''} ${sanitizedLastName || ''}`.trim();
    }
    if (sanitizedPhone !== undefined) updateFields.phone = sanitizedPhone;

    if (city !== undefined) {
      updateFields.city = sanitizeText(city, 80);
      updateFields['caseProfile.city'] = updateFields.city;
    }
    if (state !== undefined) {
      updateFields.state = sanitizeText(state, 40);
      updateFields['caseProfile.state'] = updateFields.state;
    }
    if (zipCode !== undefined) {
      updateFields.zipCode = sanitizeZipCode(zipCode);
      updateFields['caseProfile.zipCode'] = updateFields.zipCode;
    }
    if (city !== undefined || state !== undefined || zipCode !== undefined) {
      const locStr = [updateFields.city || '', updateFields.state || ''].filter(Boolean).join(', ') + (updateFields.zipCode ? ` ${updateFields.zipCode}` : '');
      if (locStr.trim()) updateFields.location = locStr.trim();
    }
    if (preferredContactMethod !== undefined) {
      updateFields.preferredContactMethod = normalizeContactMethod(preferredContactMethod);
      updateFields['caseProfile.preferredContactMethod'] = updateFields.preferredContactMethod;
    }
    if (smsConsent !== undefined) {
      updateFields.smsConsent = Boolean(smsConsent);
      updateFields['caseProfile.smsNotifications'] = Boolean(smsConsent);
    }

    if (isMongoConnected) {
      const user = await User.findOneAndUpdate(
        { email: targetEmail },
        { $set: updateFields },
        { new: true, upsert: false } // Disabled upsert: true to prevent unauthorized account creation/tampering
      ).select('-passwordHash');

      if (!user) {
        return res.status(404).json({ error: 'User record not found' });
      }

      const userJson = user.toObject();
      fallbackUsers.set(targetEmail, userJson);
      fallbackUsers.set(user._id.toString(), userJson);

      return res.json({ success: true, user: userJson });
    }

    // In-memory fallback persistence
    let memUser = fallbackUsers.get(targetEmail);
    if (!memUser && req.user?.id) {
      memUser = fallbackUsers.get(req.user.id);
    }
    if (memUser) {
      if (!memUser.caseProfile) memUser.caseProfile = {};
      Object.entries(updateFields).forEach(([k, v]) => {
        if (k.startsWith('caseProfile.')) {
          const subKey = k.replace('caseProfile.', '');
          memUser.caseProfile[subKey] = v;
        } else {
          memUser[k] = v;
        }
      });
      fallbackUsers.set(targetEmail, memUser);
      if (memUser._id) fallbackUsers.set(memUser._id, memUser);
      const sanitized = { ...memUser };
      delete sanitized.passwordHash;
      return res.json({ success: true, user: sanitized });
    }

    return res.json({ success: true, user: { email: targetEmail, ...updateFields } });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ----------------------------------------------------
// BILLING & SUBSCRIPTIONS APIs
// ----------------------------------------------------

// Create Checkout Session
app.post('/api/billing/create-checkout-session', async (req, res) => {
  try {
    const { lawyerId, email, plan, successUrl, cancelUrl } = req.body;
    if (!lawyerId) {
      return res.status(400).json({ error: 'Lawyer ID is required' });
    }

    const session = await createCheckoutSession({
      lawyerId,
      email: email || 'attorney@lawyercomparison.com',
      plan: plan || 'premium',
      successUrl,
      cancelUrl
    });

    // If simulated checkout, auto-upgrade plan in database as well
    if (session.isSimulated && isMongoConnected) {
      const planName = PLANS[plan?.toLowerCase()]?.name || 'Premium Tier';
      if (mongoose.Types.ObjectId.isValid(lawyerId)) {
        await User.findByIdAndUpdate(lawyerId, { $set: { plan: planName } });
      } else {
        await User.findOneAndUpdate({ email: lawyerId }, { $set: { plan: planName } });
      }
    }

    res.json(session);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe Webhook Endpoint
app.post('/api/billing/webhook', async (req, res) => {
  const event = req.body;
  console.log(`[Stripe Webhook] Received event: ${event.type || 'simulated.event'}`);
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    const lawyerId = session?.metadata?.lawyerId;
    const plan = session?.metadata?.plan || 'Premium Tier';
    
    if (lawyerId && isMongoConnected) {
      if (mongoose.Types.ObjectId.isValid(lawyerId)) {
        await User.findByIdAndUpdate(lawyerId, { $set: { plan } });
      } else {
        await User.findOneAndUpdate({ email: lawyerId }, { $set: { plan } });
      }
      console.log(`[Stripe Webhook] Upgraded lawyer ${lawyerId} to ${plan}`);
    }
  }

  res.json({ received: true });
});

// ----------------------------------------------------
// HEALTH & SYSTEM STATUS API
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: isMongoConnected ? 'connected' : 'in-memory-fallback',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ----------------------------------------------------
// SOCKET.IO REAL-TIME CHAT ENGINE
// ----------------------------------------------------

// Helper to extract cookie value by name from cookie header string
function parseCookieHeader(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

io.use((socket, next) => {
  let token = socket.handshake.auth?.token;
  
  // If token is not provided in auth or is not a JWT format, check HTTP cookies from handshake
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    const cookieHeader = socket.handshake.headers?.cookie;
    token = parseCookieHeader(cookieHeader, 'client_session') || parseCookieHeader(cookieHeader, 'lawyer_session');
  }

  // Also check Authorization header
  if (!token && socket.handshake.headers?.authorization?.startsWith('Bearer ')) {
    token = socket.handshake.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new Error("Authentication error: No authentication token provided"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.userEmail = decoded.email;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    console.warn(`[!] Socket authentication rejected: ${err.message}`);
    return next(new Error("Authentication error: Invalid or expired token"));
  }
});

io.on('connection', (socket) => {
  console.log(`[+] Socket securely connected: ${socket.id} (User: ${socket.userId}, Email: ${socket.userEmail})`);

  socket.on('join_room', (roomId) => {
    // Room ID must include the verified socket.userId or socket.userEmail
    const isAuthorized = typeof roomId === 'string' && (
      roomId.includes(socket.userId) || 
      (socket.userEmail && roomId.includes(socket.userEmail))
    );

    if (!isAuthorized) {
      console.warn(`[!] Unauthorized room join attempt by user ${socket.userId} (${socket.userEmail}) for room ${roomId}`);
      return;
    }
    socket.join(roomId);
  });

  socket.on('sendMessage', async (data) => {
    try {
      const { roomId, message } = data;
      if (!message || typeof message !== 'object') return;
      
      // Ensure senderId matches authenticated user identity
      const isSenderAuthorized = message.senderId === socket.userId || message.senderId === socket.userEmail;
      if (!isSenderAuthorized) {
        console.warn(`[!] Message spoofing attempt blocked for socket ${socket.id} (claimed: ${message.senderId}, verified: ${socket.userId})`);
        return;
      }

      let newId;
      if (isMongoConnected) {
        const newMsg = new Message({
          roomId,
          senderId: message.senderId,
          receiverId: message.receiverId,
          text: message.text,
          timestamp: new Date(message.timestamp || Date.now())
        });
        await newMsg.save();
        newId = newMsg._id.toString();
      } else {
        newId = "mock-" + Date.now();
        fallbackMessages.push({
          id: newId,
          roomId,
          senderId: message.senderId,
          receiverId: message.receiverId,
          text: message.text,
          timestamp: message.timestamp || new Date().toISOString()
        });
      }

      io.to(roomId).emit('receiveMessage', { ...message, id: newId });
    } catch (error) {
      console.error('Error saving socket message:', error);
    }
  });

  socket.on('typing_start', (data) => {
    if (data.roomId) {
      socket.to(data.roomId).emit('typing_start', { senderId: data.senderId });
    }
  });

  socket.on('typing_stop', (data) => {
    if (data.roomId) {
      socket.to(data.roomId).emit('typing_stop', { senderId: data.senderId });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
  });
});

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.stack || err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred' : err.message
  });
});

if (require.main === module) {
  const PORT = process.env.BACKEND_PORT || 3001;
  server.listen(PORT, () => {
    console.log(`[⚡] LawyerComparison API & Socket.IO server running on port ${PORT}`);
  });
}

module.exports = { app, server, io };

