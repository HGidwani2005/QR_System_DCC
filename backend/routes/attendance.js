const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// POST /api/attendance/mark - Mark attendance via QR token
router.post('/mark', verifyToken, async (req, res) => {
  const { qrToken } = req.body;

  if (!qrToken) {
    return res.status(400).json({ error: 'qrToken is required.' });
  }

  // Must have a complete profile
  if (!req.user.profileComplete) {
    return res.status(403).json({
      error: 'Please complete your profile before marking attendance.',
      code: 'PROFILE_INCOMPLETE',
    });
  }

  try {
    // Find meeting by QR token
    const meetingSnapshot = await db
      .collection('meetings')
      .where('qrToken', '==', qrToken)
      .limit(1)
      .get();

    if (meetingSnapshot.empty) {
      return res.status(404).json({ error: 'Invalid QR code.', code: 'INVALID_TOKEN' });
    }

    const meetingDoc = meetingSnapshot.docs[0];
    const meeting = meetingDoc.data();

    // Check QR expiry
    const expiresAt = meeting.qrExpiresAt?.toDate
      ? meeting.qrExpiresAt.toDate()
      : new Date(meeting.qrExpiresAt);

    if (new Date() > expiresAt) {
      return res.status(410).json({ error: 'This QR code has expired.', code: 'QR_EXPIRED' });
    }

    // Check for duplicate attendance
    const existingSnapshot = await db
      .collection('attendance')
      .where('userId', '==', req.user.uid)
      .where('meetingId', '==', meetingDoc.id)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        error: 'You have already marked attendance for this meeting.',
        code: 'DUPLICATE_ATTENDANCE',
        attendance: { id: existingSnapshot.docs[0].id, ...existingSnapshot.docs[0].data() },
      });
    }

    // Create attendance record
    const attendanceData = {
      userId: req.user.uid,
      meetingId: meetingDoc.id,
      meetingTitle: meeting.title,
      meetingDate: meeting.date,
      timestamp: new Date(),
      userName: req.user.userData?.name || req.user.name,
      userEmail: req.user.email,
      enrollment: req.user.userData?.enrollment || '',
      year: req.user.userData?.year || null,
      position: req.user.userData?.position || '',
    };

    const attendanceRef = await db.collection('attendance').add(attendanceData);

    // Increment meeting attendee count
    await db.collection('meetings').doc(meetingDoc.id).update({
      attendeeCount: (meeting.attendeeCount || 0) + 1,
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully!',
      attendance: { id: attendanceRef.id, ...attendanceData },
    });
  } catch (err) {
    console.error('POST /attendance/mark error:', err);
    res.status(500).json({ error: 'Failed to mark attendance.' });
  }
});

// GET /api/attendance/my - Own attendance records
router.get('/my', verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('attendance')
      .where('userId', '==', req.user.uid)
      .orderBy('timestamp', 'desc')
      .get();

    const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Get total meetings count
    const totalMeetingsSnap = await db.collection('meetings').get();
    const totalMeetings = totalMeetingsSnap.size;
    const attended = records.length;
    const percentage = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;

    return res.json({ records, attended, totalMeetings, percentage });
  } catch (err) {
    console.error('GET /attendance/my error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance.' });
  }
});

// GET /api/attendance - All attendance records (admin)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { meetingId, userId } = req.query;
    let query = db.collection('attendance').orderBy('timestamp', 'desc');

    if (meetingId) query = query.where('meetingId', '==', meetingId);
    if (userId) query = query.where('userId', '==', userId);

    const snapshot = await query.limit(500).get();
    const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({ records });
  } catch (err) {
    console.error('GET /attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
});

module.exports = router;
