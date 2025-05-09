import nodemailer from 'nodemailer';
import { Logger } from './logger.js';
import { emailTemplates } from './emailTemplates.js';

const DISABLE_EMAILS = process.env.DISABLE_EMAILS === 'true';

// Create reusable transporter using Gmail
const createTransporter = () => {
  // For Gmail
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // Only for development
    }
  });
};

// Verify transporter connection
const verifyTransporter = async (transporter) => {
  try {
    await transporter.verify();
    Logger.info('Email service connection verified');
    return true;
  } catch (error) {
    Logger.error('Email service connection failed', { 
      error: error.message,
      service: process.env.EMAIL_SERVICE,
      host: process.env.EMAIL_HOST
    });
    return false;
  }
};

let transporter = createTransporter();
verifyTransporter(transporter);

// Generic send email function with retry
export const sendEmail = async ({ to, subject, html }, retryCount = 3) => {
  if (DISABLE_EMAILS) {
    Logger.info('Email sending disabled', { to, subject });
    return { messageId: 'disabled' };
  }

  try {
    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      throw new Error('Email configuration missing');
    }

    const mailOptions = {
      from: `"Vacua Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    Logger.info('Email sent successfully', { 
      to, 
      subject,
      messageId: info.messageId 
    });
    return info;

  } catch (error) {
    Logger.error('Failed to send email', { 
      error: error.message, 
      to, 
      subject
    });
    
    if (retryCount > 0) {
      Logger.info('Retrying email send...', { remainingAttempts: retryCount - 1 });
      // Create new transporter for retry
      transporter = createTransporter();
      return sendEmail({ to, subject, html }, retryCount - 1);
    }
    
    throw error;
  }
};

// Verification status update email
export const sendVerificationStatusEmail = async (email, { fullName, status, reason, type }) => {
  try {
    const statusDisplay = status === 'verified' ? 'Approved' : 'Rejected';
    const template = emailTemplates.verificationStatusEmail({
      fullName,
      status: statusDisplay,
      reason,
      type
    });

    await sendEmail({
      to: email,
      subject: `${type.charAt(0).toUpperCase() + type.slice(1)} Verification ${statusDisplay}`,
      html: template
    });

    Logger.info('Verification status email sent', {
      email,
      status,
      type
    });
  } catch (error) {
    Logger.error('Failed to send verification status email', {
      error: error.message,
      email,
      status,
      type
    });
    throw error;
  }
};

// Business verification email
export const sendBusinessVerificationEmail = async (email, { companyName, verificationId }) => {
  try {
    const template = emailTemplates.businessVerificationEmail({
      companyName,
      verificationId
    });

    await sendEmail({
      to: email,
      subject: 'Business Verification Submission Received',
      html: template
    });

    Logger.info('Business verification email sent', { email, companyName });
  } catch (error) {
    Logger.error('Failed to send business verification email', {
      error: error.message,
      email
    });
    throw error;
  }
};

// Property verification email
export const sendPropertyVerificationEmail = async (email, { fullName, propertyAddress, verificationId }) => {
  try {
    const template = emailTemplates.propertyVerificationEmail({
      fullName,
      propertyAddress,
      verificationId
    });

    await sendEmail({
      to: email,
      subject: 'Property Verification Submission Received',
      html: template
    });

    Logger.info('Property verification email sent', { email, propertyAddress });
  } catch (error) {
    Logger.error('Failed to send property verification email', {
      error: error.message,
      email
    });
    throw error;
  }
};

// Verification specific email functions with error handling
export const sendVerificationEmail = async (email, { fullName, verificationId }) => {
  try {
    await sendEmail({
      to: email,
      subject: 'Identity Verification Required',
      html: emailTemplates.verificationEmail({ fullName, verificationId })
    });
    Logger.info('Verification email sent', { email, verificationId });
  } catch (error) {
    // Log error but don't throw - allow verification to continue
    Logger.warn('Verification email failed to send, but verification process continues', {
      error: error.message,
      email
    });
  }
};

// Student verification email
export const sendStudentVerificationEmail = async (email, { fullName, verificationId }) => {
  try {
    await sendEmail({
      to: email,
      subject: 'Student Verification Required',
      html: emailTemplates.studentVerificationEmail({ fullName, verificationId })
    });
  } catch (error) {
    Logger.warn('Student verification email failed to send', { error: error.message, email });
  }
};