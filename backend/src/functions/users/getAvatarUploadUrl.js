const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { withAuth } = require('../../common/middleware');

const s3Client = new S3Client();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 5_242_880;

/**
 * Returns true iff contentType is one of the allowed image MIME types.
 * @param {string} contentType
 * @returns {boolean}
 */
const isValidContentType = (contentType) =>
  ALLOWED_CONTENT_TYPES.includes(contentType);

/**
 * Returns true iff fileSize is greater than 0 and at most 5 MB.
 * @param {number} fileSize
 * @returns {boolean}
 */
const isValidFileSize = (fileSize) =>
  fileSize > 0 && fileSize <= MAX_FILE_SIZE;

/**
 * Lambda handler for generating a pre-signed S3 PUT URL for avatar upload.
 * @param {Object} event - API Gateway event with user info added by auth middleware
 * @returns {Object} - API Gateway response
 */
const handler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;

    // Authorization: users may only upload their own avatar
    if (userId !== event.user.id) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'You can only upload your own avatar' }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    const { contentType, fileSize } = JSON.parse(event.body);

    if (!isValidContentType(contentType)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Invalid file type. Allowed: image/jpeg, image/png, image/gif',
        }),
      };
    }

    if (!isValidFileSize(fileSize)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'File size exceeds 5 MB limit' }),
      };
    }

    const bucketName = process.env.AVATAR_BUCKET_NAME;
    const cdnDomain = process.env.AVATAR_CDN_DOMAIN;

    if (!bucketName || !cdnDomain) {
      throw new Error('AVATAR_BUCKET_NAME or AVATAR_CDN_DOMAIN environment variable is not set');
    }

    const key = `avatars/${userId}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const avatarUrl = `https://${cdnDomain}/avatars/${userId}`;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ uploadUrl, avatarUrl }),
    };
  } catch (error) {
    console.error('Error generating avatar upload URL:', error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Error generating avatar upload URL',
        error: error.message || 'Unknown error',
      }),
    };
  }
};

exports.handler = withAuth(handler);
exports.isValidContentType = isValidContentType;
exports.isValidFileSize = isValidFileSize;
