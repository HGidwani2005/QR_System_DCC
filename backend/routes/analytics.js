const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/analytics/summary - Dashboard stats
router.get('/summary', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [usersSnap, meetingsSnap, attendanceSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('meetings').get(),
      db.collection('attendance').get(),
    ]);

    const totalMembers = usersSnap.size;
    const totalMeetings = meetingsSnap.size;
    const totalAttendanceRecords = attendanceSnap.size;

    // Count unique users with low attendance (<75%)
    const userAttendanceCounts = {};
    attendanceSnap.docs.forEach((doc) => {
      const { userId } = doc.data();
      userAttendanceCounts[userId] = (userAttendanceCounts[userId] || 0) + 1;
    });

    let lowAttendanceCount = 0;
    if (totalMeetings > 0) {
      Object.values(userAttendanceCounts).forEach((count) => {
        if ((count / totalMeetings) * 100 < 75) lowAttendanceCount++;
      });
    }

    // Today's attendance (meetings today)
    const today = new Date().toISOString().split('T')[0];
    const todayMeetingsSnap = await db.collection('meetings').where('date', '==', today).get();
    const todayMeetingIds = todayMeetingsSnap.docs.map((d) => d.id);

    let todayAttendance = 0;
    if (todayMeetingIds.length > 0) {
      const todayAttSnap = await db
        .collection('attendance')
        .where('meetingId', 'in', todayMeetingIds.slice(0, 10))
        .get();
      todayAttendance = todayAttSnap.size;
    }

    const todayAttendancePercent =
      totalMembers > 0 && todayMeetingIds.length > 0
        ? Math.round((todayAttendance / totalMembers) * 100)
        : null;

    // Upcoming meetings (date >= today)
    const upcomingSnap = await db
      .collection('meetings')
      .where('date', '>=', today)
      .orderBy('date', 'asc')
      .limit(10)
      .get();

    return res.json({
      totalMembers,
      totalMeetings,
      totalAttendanceRecords,
      lowAttendanceCount,
      todayAttendancePercent,
      upcomingMeetingsCount: upcomingSnap.size,
    });
  } catch (err) {
    console.error('GET /analytics/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics summary.' });
  }
});

// GET /api/analytics/students - Per-student attendance with percentages
router.get('/students', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;

    const [usersSnap, meetingsSnap, attendanceSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('meetings').get(),
      db.collection('attendance').get(),
    ]);

    const totalMeetings = meetingsSnap.size;

    // Count attendance per user
    const attendanceCounts = {};
    attendanceSnap.docs.forEach((doc) => {
      const { userId } = doc.data();
      attendanceCounts[userId] = (attendanceCounts[userId] || 0) + 1;
    });

    let students = usersSnap.docs.map((doc) => {
      const data = doc.data();
      const attended = attendanceCounts[doc.id] || 0;
      const percentage = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        enrollment: data.enrollment,
        year: data.year,
        position: data.position,
        role: data.role,
        attended,
        totalMeetings,
        percentage,
        status: percentage >= 90 ? 'excellent' : percentage >= 75 ? 'good' : percentage >= 60 ? 'average' : 'alert',
      };
    });

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      students = students.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.enrollment?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
      );
    }

    return res.json({ students, totalMeetings });
  } catch (err) {
    console.error('GET /analytics/students error:', err);
    res.status(500).json({ error: 'Failed to fetch student analytics.' });
  }
});

// GET /api/analytics/meetings - Per-meeting attendance stats
router.get('/meetings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [meetingsSnap, attendanceSnap, usersSnap] = await Promise.all([
      db.collection('meetings').orderBy('date', 'desc').limit(20).get(),
      db.collection('attendance').get(),
      db.collection('users').get(),
    ]);

    const totalMembers = usersSnap.size;

    // Count attendance per meeting
    const attendanceCounts = {};
    attendanceSnap.docs.forEach((doc) => {
      const { meetingId } = doc.data();
      attendanceCounts[meetingId] = (attendanceCounts[meetingId] || 0) + 1;
    });

    const meetings = meetingsSnap.docs.map((doc) => {
      const data = doc.data();
      const attended = attendanceCounts[doc.id] || 0;
      const percentage = totalMembers > 0 ? Math.round((attended / totalMembers) * 100) : 0;
      return {
        id: doc.id,
        title: data.title,
        type: data.type,
        date: data.date,
        startTime: data.startTime,
        attended,
        totalMembers,
        percentage,
      };
    });

    return res.json({ meetings, totalMembers });
  } catch (err) {
    console.error('GET /analytics/meetings error:', err);
    res.status(500).json({ error: 'Failed to fetch meeting analytics.' });
  }
});

module.exports = router;
