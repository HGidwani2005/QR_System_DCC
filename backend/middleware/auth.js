const { auth, db } = require('../firebase');
require('dotenv').config();

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'bennett.edu.in';

const ADMIN_ROLES = ['president', 'vice_president', 'general_secretary'];

/**
 * Verifies Firebase ID token and attaches decoded user to req.user
 * Also fetches the user's role from Firestore
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided.' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);

    // Enforce Bennett email domain
    const email = decoded.email || '';
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return res.status(403).json({
        error: `Only @${ALLOWED_DOMAIN} email addresses are allowed.`,
        code: 'INVALID_DOMAIN',
      });
    }

    // Fetch user's role from Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || '',
      picture: decoded.picture || '',
      profileComplete: userData?.profileComplete || false,
      role: userData?.role || 'member',
      userData: userData || null,
    };

    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Middleware to require admin role (president, vice_president, general_secretary)
 */
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Access denied. Admin role required.',
      code: 'INSUFFICIENT_ROLE',
    });
  }
  next();
}

module.exports = { verifyToken, requireAdmin, ADMIN_ROLES };
