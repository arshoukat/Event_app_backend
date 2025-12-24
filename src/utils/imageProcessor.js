const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Process base64 image data URI and save to file system
 * @param {string} imageUrl - Base64 data URI (data:image/jpeg;base64,...)
 * @returns {Promise<string>} - URL/path to saved image
 */
async function processBase64Image(imageUrl) {
  if (!imageUrl || imageUrl === 'null') {
    return null;
  }

  try {
    // Parse data URI
    const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 image format');
    }

    const imageType = matches[1]; // jpeg, png, etc.
    const base64Data = matches[2];

    // Validate image type
    const allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    if (!allowedTypes.includes(imageType.toLowerCase())) {
      throw new Error(`Unsupported image type: ${imageType}. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Validate image size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > maxSize) {
      throw new Error('Image size exceeds 5MB limit');
    }

    // Generate unique filename
    const filename = `${crypto.randomBytes(16).toString('hex')}.${imageType}`;
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads/events');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    // Return URL path (relative to server)
    // In production, you might want to return a full URL like: https://yourdomain.com/uploads/events/filename.jpg
    const imageUrlPath = `/uploads/events/${filename}`;
    
    return imageUrlPath;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Delete image file
 * @param {string} imagePath - Path to image file
 */
function deleteImage(imagePath) {
  if (!imagePath) return;
  
  try {
    const fullPath = path.join(__dirname, '../../', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

module.exports = {
  processBase64Image,
  deleteImage
};

