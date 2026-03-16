const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { db } = require('../firebase');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/export/attendance - Download Excel file (admin only)
router.get('/attendance', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [usersSnap, meetingsSnap, attendanceSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('meetings').orderBy('date', 'asc').get(),
      db.collection('attendance').get(),
    ]);

    const users = {};
    usersSnap.docs.forEach((doc) => {
      users[doc.id] = { id: doc.id, ...doc.data() };
    });

    const meetings = meetingsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const attendanceRecords = attendanceSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Build lookup: userId -> set of meetingIds
    const userAttendedMeetings = {};
    attendanceRecords.forEach((rec) => {
      if (!userAttendedMeetings[rec.userId]) userAttendedMeetings[rec.userId] = new Set();
      userAttendedMeetings[rec.userId].add(rec.meetingId);
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dean Career Cloud';
    workbook.created = new Date();

    // ─── Sheet 1: Summary ────────────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('Attendance Summary');
    summarySheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Enrollment', key: 'enrollment', width: 16 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Position', key: 'position', width: 20 },
      { header: 'Meetings Attended', key: 'attended', width: 20 },
      { header: 'Total Meetings', key: 'total', width: 16 },
      { header: 'Attendance %', key: 'percentage', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    // Style header row
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0a47c2' },
    };

    const totalMeetings = meetings.length;

    Object.values(users).forEach((user) => {
      const attended = userAttendedMeetings[user.id]?.size || 0;
      const pct = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;
      const status = pct >= 90 ? 'Excellent' : pct >= 75 ? 'Good' : pct >= 60 ? 'Average' : 'Alert';
      const row = summarySheet.addRow({
        name: user.name,
        email: user.email,
        enrollment: user.enrollment,
        year: user.year,
        position: user.position,
        attended,
        total: totalMeetings,
        percentage: pct,
        status,
      });
      if (pct < 75) {
        row.getCell('percentage').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD6D6' },
        };
        row.getCell('status').font = { color: { argb: 'FFD92128' }, bold: true };
      }
    });

    // ─── Sheet 2: Per-Meeting Detail ─────────────────────────────────────────
    const detailSheet = workbook.addWorksheet('Meeting-wise Records');
    detailSheet.columns = [
      { header: 'Meeting', key: 'meeting', width: 35 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Enrollment', key: 'enrollment', width: 16 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Check-in Time', key: 'timestamp', width: 22 },
    ];

    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0a47c2' },
    };

    attendanceRecords
      .sort((a, b) => {
        const da = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const db_ = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return da - db_;
      })
      .forEach((rec) => {
        const user = users[rec.userId];
        const ts = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date(rec.timestamp);
        detailSheet.addRow({
          meeting: rec.meetingTitle || '',
          date: rec.meetingDate || '',
          name: rec.userName || user?.name || '',
          enrollment: rec.enrollment || user?.enrollment || '',
          email: rec.userEmail || user?.email || '',
          timestamp: ts.toLocaleString('en-IN'),
        });
      });

    // ─── Sheet 3: Individual meeting sheets ──────────────────────────────────
    meetings.forEach((meeting) => {
      const safeName = (meeting.title || 'Meeting').replace(/[\/\\\?\*\[\]:]/g, '').slice(0, 28);
      const ws = workbook.addWorksheet(safeName);
      ws.columns = [
        { header: 'Student Name', key: 'name', width: 25 },
        { header: 'Enrollment', key: 'enrollment', width: 16 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Check-in Time', key: 'timestamp', width: 22 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0a47c2' },
      };

      const meetingRecords = attendanceRecords.filter((r) => r.meetingId === meeting.id);
      meetingRecords.forEach((rec) => {
        const user = users[rec.userId];
        const ts = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date(rec.timestamp);
        ws.addRow({
          name: rec.userName || user?.name || '',
          enrollment: rec.enrollment || user?.enrollment || '',
          email: rec.userEmail || user?.email || '',
          timestamp: ts.toLocaleString('en-IN'),
        });
      });
    });

    // Send as download
    const date = new Date().toISOString().split('T')[0];
    const filename = `DCC_Attendance_${date}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('GET /export/attendance error:', err);
    res.status(500).json({ error: 'Failed to generate Excel export.' });
  }
});

module.exports = router;
