require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Ensure credentials are present in environment
['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadImage(localPath, originalName) {
  return cloudinary.uploader.upload(localPath, {
    folder: 'cloudapp',
    use_filename: true,
    filename_override: originalName,
  });
}

async function fetchResource(publicId) {
  return cloudinary.api.resource(publicId);
}

async function deleteResource(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

const checkCloudinaryImage = async (url) => {
  try {
    const resp = await fetch(url, { method: "HEAD" });
    if (resp.ok) {
      return true;
    }
    // If HEAD fails, fallback to GET
    const getResp = await fetch(url, { method: "GET" });
    if (!getResp.ok) {
      console.log("No image");
    }
    return getResp.ok;
  } catch (error) {
    console.error("Error checking Cloudinary image:", error);
    console.log("No image");
    return false;
  }
};

module.exports = { uploadImage, fetchResource, deleteResource, checkCloudinaryImage };