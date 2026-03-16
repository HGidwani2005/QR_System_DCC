const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { db } = require('../firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');
require('dotenv').config();

const QR_EXPIRY_MINUTES = parseInt(process.env.QR_EXPIRY_MINUTES || '10');
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

function generateQRExpiry() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + QR_EXPIRY_MINUTES);
  return expiry;
}

// POST /api/meetings - Create meeting + generate QR (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { title, type, date, startTime, duration } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'title and date are required.' });
  }

  try {
    const qrToken = uuidv4();
    const qrExpiresAt = generateQRExpiry();
    const checkInUrl = `${FRONTEND_URL}/checkin?token=${qrToken}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#0a47c2', light: '#ffffff' },
    });

    const meetingData = {
      title: title.trim(),
      type: type || 'lecture',
      date,
      startTime: startTime || '',
      duration: parseInt(duration) || 60,
      qrToken,
      qrExpiresAt,
      qrDataUrl,
      checkInUrl,
      createdBy: req.user.uid,
      createdByName: req.user.userData?.name || req.user.email,
      attendeeCount: 0,
      createdAt: new Date(),
    };

    const docRef = await db.collection('meetings').add(meetingData);

    return res.status(201).json({
      success: true,
      meeting: { id: docRef.id, ...meetingData },
    });
  } catch (err) {
    console.error('POST /meetings error:', err);
    res.status(500).json({ error: 'Failed to create meeting.' });
  }
});

// POST /api/meetings/:id/refresh-qr - Regenerate QR (admin only)
router.post('/:id/refresh-qr', verifyToken, requireAdmin, async (req, res) => {
  try {
    const meetingRef = db.collection('meetings').doc(req.params.id);
    const meetingDoc = await meetingRef.get();

    if (!meetingDoc.exists) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }

    const qrToken = uuidv4();
    const qrExpiresAt = generateQRExpiry();
    const checkInUrl = `${FRONTEND_URL}/checkin?token=${qrToken}`;

    const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#0a47c2', light: '#ffffff' },
    });

    await meetingRef.update({ qrToken, qrExpiresAt, qrDataUrl, checkInUrl });

    return res.json({
      success: true,
      qrToken,
      qrExpiresAt,
      qrDataUrl,
      checkInUrl,
    });
  } catch (err) {
    console.error('POST /meetings/:id/refresh-qr error:', err);
    res.status(500).json({ error: 'Failed to refresh QR.' });
  }
});

// GET /api/meetings - List meetings (authenticated)
router.get('/', verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('meetings')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const meetings = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        type: data.type,
        date: data.date,
        startTime: data.startTime,
        duration: data.duration,
        attendeeCount: data.attendeeCount || 0,
        createdAt: data.createdAt,
        qrExpiresAt: data.qrExpiresAt,
        // Only include QR data for admin
        ...(req.user && ['president', 'vice_president', 'general_secretary'].includes(req.user.role)
          ? { qrToken: data.qrToken, qrDataUrl: data.qrDataUrl, checkInUrl: data.checkInUrl }
          : {}),
      };
    });

    return res.json({ meetings });
  } catch (err) {
    console.error('GET /meetings error:', err);
    res.status(500).json({ error: 'Failed to fetch meetings.' });
  }
});

// GET /api/meetings/:id - Single meeting
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('meetings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Meeting not found.' });

    const data = doc.data();
    const isAdmin = ['president', 'vice_president', 'general_secretary'].includes(req.user.role);

    return res.json({
      meeting: {
        id: doc.id,
        ...data,
        // Only expose QR to admins
        qrToken: isAdmin ? data.qrToken : undefined,
        qrDataUrl: isAdmin ? data.qrDataUrl : undefined,
        checkInUrl: isAdmin ? data.checkInUrl : undefined,
      },
    });
  } catch (err) {
    console.error('GET /meetings/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch meeting.' });
  }
});

// GET /api/meetings/by-token/:token - Validate QR token (public-ish, just needs auth)
router.get('/by-token/:token', verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('meetings')
      .where('qrToken', '==', req.params.token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Invalid QR code.', code: 'INVALID_TOKEN' });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check expiry
    const expiresAt = data.qrExpiresAt?.toDate ? data.qrExpiresAt.toDate() : new Date(data.qrExpiresAt);
    if (new Date() > expiresAt) {
      return res.status(410).json({ error: 'This QR code has expired.', code: 'QR_EXPIRED' });
    }

    return res.json({
      valid: true,
      meeting: {
        id: doc.id,
        title: data.title,
        type: data.type,
        date: data.date,
        startTime: data.startTime,
        duration: data.duration,
        qrExpiresAt: data.qrExpiresAt,
      },
    });
  } catch (err) {
    console.error('GET /meetings/by-token error:', err);
    res.status(500).json({ error: 'Failed to validate QR token.' });
  }
});

module.exports = router;
