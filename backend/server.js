const { loadEnv } = require('./utils/env');
loadEnv();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// Utilities & Middleware
const { hashPassword, comparePassword } = require('./utils/auth');
const { authenticate, optionalAuth, requireRole } = require('./middleware/auth');
const { seedDatabase, INITIAL_LAWYERS } = require('./seed');
const { securityHeaders, createRateLimiter, requestLogger } = require('./middleware/security');
const { generateIcsCalendar, generateGoogleCalendarUrl, sendTransactionalEmail } = require('./utils/notifications');
const { createCheckoutSession, PLANS } = require('./utils/stripe');

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

app.use(express.json());
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

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lawyer_directory';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-lawyer-key';

mongoose.connect(MONGODB_URI)
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
    httpOnly: false, // Accessible by Next.js middleware / client auth checkers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// ----------------------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------------------

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

    const cleanEmail = email.toLowerCase().trim();

    if (isMongoConnected) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = hashPassword(password);
      const user = await User.create({
        email: cleanEmail,
        passwordHash,
        role,
        name: name || `${firstName || ''} ${lastName || ''}`.trim() || undefined,
        firstName: firstName || (name ? name.split(' ')[0] : undefined),
        lastName: lastName || (name ? name.split(' ').slice(1).join(' ') : undefined),
        firmName: role === 'lawyer' ? (firmName || 'Independent Practice') : undefined,
        specialty: role === 'lawyer' ? (specialty || 'General Practice') : undefined,
        onboarded: role === 'client' ? true : false
      });

      const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, role, token);

      const userJson = user.toObject();
      delete userJson.passwordHash;
      return res.status(201).json({ success: true, user: userJson, token });
    } else {
      // In-memory fallback
      const mockId = 'mock-' + Date.now();
      const mockUser = {
        _id: mockId,
        email: cleanEmail,
        role,
        name: name || `${firstName || ''} ${lastName || ''}`.trim(),
        firstName,
        lastName,
        firmName,
        onboarded: role === 'client'
      };
      const token = jwt.sign({ id: mockId, email: cleanEmail, role }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, role, token);
      return res.status(201).json({ success: true, user: mockUser, token });
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

      const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, role, token);

      const userJson = user.toObject();
      delete userJson.passwordHash;
      return res.json({ success: true, user: userJson, token });
    } else {
      // In-memory fallback
      const mockUser = {
        _id: "mock-" + Date.now(),
        email: cleanEmail,
        role,
        firstName: role === 'client' ? "Aditya" : "Robert",
        lastName: role === 'client' ? "Vishwa" : "Pearson",
        name: role === 'client' ? "Aditya Vishwa" : "Robert H. Pearson",
        onboarded: true
      };
      const token = jwt.sign({ id: mockUser._id, email: cleanEmail, role }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, role, token);
      return res.json({ success: true, user: mockUser, token });
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

// Auth Hydration / Current User
app.get('/api/auth/me', async (req, res) => {
  const clientToken = req.cookies.client_session;
  const lawyerToken = req.cookies.lawyer_session;
  
  let clientUser = null;
  let lawyerUser = null;

  try {
    if (clientToken) {
      const decoded = jwt.verify(clientToken, JWT_SECRET);
      if (isMongoConnected) {
        clientUser = await User.findById(decoded.id).select('-passwordHash');
      } else {
        clientUser = { _id: decoded.id, email: decoded.email, role: 'client', name: "Aditya Vishwa" };
      }
    }
    if (lawyerToken) {
      const decoded = jwt.verify(lawyerToken, JWT_SECRET);
      if (isMongoConnected) {
        lawyerUser = await User.findById(decoded.id).select('-passwordHash');
      } else {
        lawyerUser = { _id: decoded.id, email: decoded.email, role: 'lawyer', name: "Robert H. Pearson", onboarded: true };
      }
    }
    res.json({ clientUser, lawyerUser });
  } catch (error) {
    res.json({ clientUser: null, lawyerUser: null });
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
app.post('/api/consultations', apiLimiter, async (req, res) => {
  try {
    const { clientId, clientName, clientEmail, clientPhone, lawyerId, lawyerName, date, time, topic, consultationFee } = req.body;

    if (!clientId || !lawyerId || !date || !time) {
      return res.status(400).json({ error: 'Client, lawyer, date, and time are required' });
    }

    const zoomLink = `https://zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}`;

    // Generate calendar start time timestamp
    let startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(14, 0, 0, 0);

    const calendarDetails = {
      title: `Case Consultation: ${topic || 'Initial Legal Review'} - ${lawyerName || 'Verified Attorney'}`,
      description: `LawyerComparison Scheduled Case Consultation.\nAttorney: ${lawyerName || 'Verified Attorney'}\nClient: ${clientName || 'Verified Client'}\nZoom Meeting: ${zoomLink}`,
      location: zoomLink,
      startTime
    };

    const googleCalendarUrl = generateGoogleCalendarUrl(calendarDetails);
    const icsContent = generateIcsCalendar(calendarDetails);

    let savedConsultation = null;

    if (isMongoConnected) {
      savedConsultation = await Consultation.create({
        clientId,
        clientName: clientName || "Verified Client",
        clientEmail: clientEmail || "client@example.com",
        clientPhone: clientPhone || "",
        lawyerId,
        lawyerName: lawyerName || "Verified Attorney",
        date,
        time,
        topic: topic || "Initial Case Consultation",
        consultationFee: consultationFee || 0,
        zoomLink,
        status: "upcoming"
      });
    } else {
      // In-memory fallback
      savedConsultation = {
        id: "cons-" + Date.now(),
        clientId,
        clientName,
        clientEmail,
        lawyerId,
        lawyerName,
        date,
        time,
        topic: topic || "Initial Case Consultation",
        zoomLink,
        status: "upcoming"
      };
    }

    // Dispatch confirmation email with .ics attachment
    if (clientEmail) {
      sendTransactionalEmail({
        to: clientEmail,
        subject: `Consultation Confirmed: ${topic || 'Legal Consultation'} with ${lawyerName || 'Attorney'}`,
        html: `<h2>Your Consultation is Confirmed</h2><p>You are scheduled to meet with <strong>${lawyerName || 'Attorney'}</strong> on <strong>${date} at ${time}</strong>.</p><p><a href="${zoomLink}">Join Zoom Video Room</a></p><p><a href="${googleCalendarUrl}">Add to Google Calendar</a></p>`,
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
app.get('/api/consultations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (isMongoConnected) {
      const consultations = await Consultation.find({
        $or: [{ clientId: userId }, { lawyerId: userId }]
      }).sort({ createdAt: -1 });

      return res.json(consultations.map(c => ({
        id: c._id.toString(),
        clientId: c.clientId,
        clientName: c.clientName,
        lawyerId: c.lawyerId,
        lawyerName: c.lawyerName,
        topic: c.topic,
        date: c.date,
        time: c.time,
        zoomLink: c.zoomLink,
        status: c.status
      })));
    }

    return res.json([
      { id: "cons-1", clientId: userId, lawyerId: "lwy-001", lawyerName: "Robert H. Pearson", topic: "Corporate Litigation Review", date: "Tomorrow", time: "2:00 PM EST", zoomLink: "https://zoom.us/j/123456789", status: "upcoming" },
      { id: "cons-2", clientId: userId, lawyerId: "lwy-002", lawyerName: "Sarah Jenkins", topic: "Merger Discussion", date: "Sep 15, 2026", time: "10:00 AM EST", zoomLink: "https://zoom.us/j/987654321", status: "completed" }
    ]);
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({ error: 'Failed to fetch consultations' });
  }
});

// ----------------------------------------------------
// CONTACT & INQUIRIES APIs
// ----------------------------------------------------

// Submit Contact Inquiry
app.post('/api/inquiries', apiLimiter, async (req, res) => {
  try {
    const { lawyerId, lawyerName, fullName, email, phone, issue, description } = req.body;
    
    if (!fullName || !email || !issue || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    let savedInquiry = null;

    if (isMongoConnected) {
      savedInquiry = await Inquiry.create({
        lawyerId: lawyerId || 'general',
        lawyerName: lawyerName || 'Directory Administration',
        fullName,
        email,
        phone,
        issue,
        description
      });

      // Also create an initial message thread so lawyer can see it in Client Inbox!
      if (lawyerId) {
        const roomId = [String(email), String(lawyerId)].sort().join('_');
        await Message.create({
          roomId,
          senderId: email,
          receiverId: lawyerId,
          text: `[New Inquiry - ${issue}]: ${description} (Contact: ${fullName}, ${phone || email})`,
          timestamp: new Date()
        });
      }
    }

    // Send transactional lead alert email
    sendTransactionalEmail({
      to: 'inquiries@lawyercomparison.com',
      subject: `New Case Lead: ${issue} from ${fullName}`,
      html: `<h2>New Case Inquiry</h2><p><strong>Client:</strong> ${fullName} (${email}, ${phone || 'N/A'})</p><p><strong>Target Attorney:</strong> ${lawyerName || 'Directory'}</p><p><strong>Issue:</strong> ${issue}</p><p>${description}</p>`
    }).catch(err => console.error('[Inquiry Lead Alert Error]:', err));

    return res.status(201).json({ success: true, inquiry: savedInquiry });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    res.status(500).json({ error: 'Failed to send inquiry' });
  }
});

// ----------------------------------------------------
// SAVED ATTORNEYS APIs
// ----------------------------------------------------

app.post('/api/clients/:id/saved-attorneys', async (req, res) => {
  try {
    const { lawyerId } = req.body;
    const clientId = req.params.id;

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

app.get('/api/clients/:id/saved-attorneys', async (req, res) => {
  try {
    const clientId = req.params.id;
    
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

    if (clientsMap.size === 0) {
      clientsMap.set("adityavishwa02@gmail.com", {
        id: "adityavishwa02@gmail.com",
        name: "Aditya Vishwa",
        lastMsg: "I need assistance reviewing a corporate contract.",
        time: "10:42 AM",
        unread: false
      });
    }

    return res.json(Array.from(clientsMap.values()));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Update User Account Details
app.put('/api/users/:email', async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const email = req.params.email;

    if (isMongoConnected) {
      const user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            firstName,
            lastName,
            name: `${firstName || ''} ${lastName || ''}`.trim(),
            phone
          }
        },
        { new: true, upsert: true }
      ).select('-passwordHash');

      return res.json({ success: true, user });
    }

    return res.json({ success: true, user: { email, firstName, lastName, phone } });
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

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  socket.userId = token;
  next();
});

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id} (User: ${socket.userId})`);

  socket.on('join_room', (roomId) => {
    if (!roomId.includes(socket.userId)) {
      console.warn(`[!] Unauthorized room join attempt by ${socket.userId} for ${roomId}`);
      return;
    }
    socket.join(roomId);
  });

  socket.on('sendMessage', async (data) => {
    try {
      const { roomId, message } = data;
      
      if (message.senderId !== socket.userId) {
        console.warn(`[!] Message spoofing attempt by ${socket.userId}`);
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[⚡] LawyerComparison API & Socket.IO server running on port ${PORT}`);
});
