const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { fileData } = JSON.parse(event.body);

    if (!fileData) {
      throw new Error("No file data provided");
    }

    // Basic Validation (Approximate check for Base64 size)
    // 2MB * 1.37 (Base64 overhead) ~= 2.8MB string length
    if (fileData.length > 3000000) { 
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "File too large. Max 2MB." })
        };
    }

    // Check header for type (simple check)
    if (!fileData.startsWith('data:image/') && !fileData.startsWith('data:application/pdf')) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Invalid file type. Only Images and PDFs allowed." })
        };
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileData, {
      folder: "scholarship_docs",
      resource_type: "auto" // Detects pdf/image
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: result.secure_url })
    };

  } catch (error) {
    console.error("Upload Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Upload failed", details: error.message })
    };
  }
};