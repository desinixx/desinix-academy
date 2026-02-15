const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { uid, adminSecret } = JSON.parse(event.body);

    // SECURITY: Prevent public access to this function
    if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Set custom claim
    await admin.auth().setCustomUserClaims(uid, { admin: true });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Success! User ${uid} is now an admin.` })
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};