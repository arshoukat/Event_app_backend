require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('GMAIL_USER or GMAIL_APP_PASSWORD is missing in environment');
      process.exit(1);
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // verify connection configuration
    await transporter.verify();
    console.log('Transporter verified OK — credentials accepted.');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // send test to yourself
      subject: 'Test email from Event App',
      text: `This is a test. If you see this, Gmail sending works. Time: ${new Date().toISOString()}`
    });

    console.log('Message sent:', info.messageId);
    console.log('If nodemailer returned info, check your inbox (or spam).');

  } catch (err) {
    console.error('Error sending test email:', err);
    process.exit(1);
  }
})();
