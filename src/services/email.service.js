const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

// Initialize Firebase Admin if needed (for Firebase Cloud Functions integration)
let firebaseInitialized = false;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
      firebaseInitialized = true;
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
  }
}

// Create nodemailer transporter
// Configure via environment variables:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// Or use Gmail: GMAIL_USER, GMAIL_APP_PASSWORD
// Or use SendGrid (Firebase recommended): SENDGRID_API_KEY
const createTransporter = () => {
  // If using SendGrid (Firebase recommended email service)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // If using Gmail with App Password
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  // If using custom SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // For development/testing - logs OTP to console
  // In production, configure SMTP, Gmail, or SendGrid credentials
  console.warn('\n⚠️  EMAIL SERVICE NOT CONFIGURED ⚠️');
  console.warn('Email credentials not found. OTP will be logged to console only.');
  console.warn('To enable email sending, add one of the following to your .env file:');
  console.warn('  Option 1 (SendGrid - Firebase recommended): SENDGRID_API_KEY');
  console.warn('  Option 2 (Gmail): GMAIL_USER and GMAIL_APP_PASSWORD');
  console.warn('  Option 3 (SMTP): SMTP_HOST, SMTP_USER, and SMTP_PASS');
  console.warn('See FIREBASE_EMAIL_SETUP.md for Firebase setup instructions');
  console.warn('================================================\n');
  
  return {
    sendMail: async (options) => {
      console.log('\n========== OTP EMAIL (Development Mode) ==========');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`OTP Code: ${options.text.match(/\d{6}/)?.[0] || 'N/A'}`);
      console.log('================================================\n');
      return Promise.resolve({ messageId: 'dev-mode' });
    }
  };
};

const transporter = createTransporter();

/**
 * Send OTP email
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<void>}
 */
const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@eventapp.com',
      to: email,
      subject: 'Your OTP Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      text: `Your OTP verification code is: ${otp}. This code will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = {
  sendOTPEmail
};

