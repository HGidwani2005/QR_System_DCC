const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let serviceAccount;
try {
  serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'));
} catch (e) {
  console.error('⚠️  Could not load Firebase service account. Make sure serviceAccountKey.json exists.');
  console.error('   Download it from Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
