const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { verifyToken } = require('../middleware/auth');

// GET /api/profile - Fetch own profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.json({ exists: false, user: null });
    }
    return res.json({ exists: true, user: { id: userDoc.id, ...userDoc.data() } });
  } catch (err) {
    console.error('GET /profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// POST /api/profile - Create or update profile
router.post('/', verifyToken, async (req, res) => {
  const { name, enrollment, year, position } = req.body;

  if (!name || !enrollment || !year || !position) {
    return res.status(400).json({ error: 'name, enrollment, year, and position are required.' });
  }

  // Validate year
  const yearNum = parseInt(year);
  if (isNaN(yearNum) || yearNum < 1 || yearNum > 4) {
    return res.status(400).json({ error: 'Year must be 1–4.' });
  }

  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const existingDoc = await userRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};

    const userData = {
      name: name.trim(),
      email: req.user.email,
      enrollment: enrollment.trim().toUpperCase(),
      year: yearNum,
      position: position.trim(),
      role: existingData.role || 'member', // preserve existing role
      profileComplete: true,
      updatedAt: new Date(),
      createdAt: existingData.createdAt || new Date(),
    };

    await userRef.set(userData, { merge: true });
    return res.json({ success: true, user: { id: req.user.uid, ...userData } });
  } catch (err) {
    console.error('POST /profile error:', err);
    res.status(500).json({ error: 'Failed to save profile.' });
  }
});

// GET /api/profile/all - Fetch all users (admin only handled by analytics route)
router.get('/positions', verifyToken, async (req, res) => {
  const positions = [
    'President',
    'Vice President',
    'General Secretary',
    'Lead',
    'Coordinator',
    'Core Member',
    'Volunteer',
  ];
  res.json({ positions });
});

module.exports = router;
