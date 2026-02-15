const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin (Singleton pattern)
if (!admin.apps.length) {
  // In Netlify, we store the Service Account JSON as a string in an ENV variable
  // or construct it from individual ENV vars.
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { 
      orderCreationId, 
      razorpayPaymentId, 
      razorpaySignature,
      userId,
      courseId,
      amount
    } = JSON.parse(event.body);

    // 1. Verify Signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpaySignature) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ status: 'failure', message: 'Invalid Signature' }) 
      };
    }

    // 2. Security: Write Enrollment to Firestore from Backend
    // This prevents users from calling the DB directly to enroll without paying
    const enrollmentData = {
      userId,
      courseId,
      paymentId: razorpayPaymentId,
      orderId: orderCreationId,
      amountPaid: amount,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      platform: 'web'
    };

    // Use a transaction or batch if needed, but simple add is fine here
    await db.collection('enrollments').add(enrollmentData);

    // Optional: Update user document to include course ID in an array for faster frontend reads
    await db.collection('users').doc(userId).update({
        enrolledCourses: admin.firestore.FieldValue.arrayUnion(courseId)
    });

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ status: 'success', paymentId: razorpayPaymentId }) 
    };

  } catch (error) {
    console.error("Verification Error:", error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ status: 'error', message: error.message }) 
    };
  }
};