// Base styles and layout template
const baseEmailTemplate = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .logo-container {
            margin-bottom: 15px;
            background-color: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 8px;
            display: inline-block;
        }
        .logo {
            width: 140px;
            height: auto;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .content {
            padding: 40px 30px;
            text-align: left;
            background: linear-gradient(180deg, #ffffff 0%, #f9f9f9 100%);
        }
        .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #2d3748;
            margin-bottom: 20px;
        }
        .content ul, .content ol {
            margin: 20px 0;
            padding-left: 20px;
        }
        .content li {
            margin-bottom: 10px;
            color: #2d3748;
        }
        .otp {
            font-size: 36px;
            font-weight: bold;
            color: #007bff;
            margin: 30px 0;
            text-align: center;
            letter-spacing: 8px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 2px dashed #007bff;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            margin: 20px 0;
            background: linear-gradient(135deg, #28a745 0%, #218838 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .button:hover {
            background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .login-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .login-details p {
            margin: 10px 0;
        }
        .divider {
            height: 2px;
            background: linear-gradient(90deg, #f4f4f4 0%, #e0e0e0 50%, #f4f4f4 100%);
            margin: 30px 0;
        }
        .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 30px 20px;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #eee;
        }
        .social-links {
            margin: 20px 0;
            padding: 15px 0;
            border-top: 1px solid #eee;
            border-bottom: 1px solid #eee;
        }
        .social-links a {
            display: inline-block;
            margin: 0 15px;
            color: #666;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        .social-links a:hover {
            color: #007bff;
        }
        .footer-links {
            margin-top: 15px;
        }
        .footer-links a {
            color: #007bff;
            text-decoration: none;
            margin: 0 10px;
            transition: color 0.3s ease;
        }
        .footer-links a:hover {
            color: #0056b3;
        }
        .contact-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 13px;
            color: #888;
        }
        .highlight-box {
            background-color: #fff8dc;
            border: 1px solid #ffe4b5;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .warning-text {
            color: #dc3545;
            font-weight: 500;
        }
        @media only screen and (max-width: 600px) {
            .container {
                margin: 10px;
                width: auto;
            }
            .content {
                padding: 20px;
            }
            .otp {
                font-size: 28px;
                letter-spacing: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-container">
                <img src="https://vacua.com/logo.png" alt="Vacua Logo" class="logo">
            </div>
            <h1>${title}</h1>
        </div>
        ${content}
        <div class="footer">
            <div class="social-links">
                <a href="https://facebook.com/vacua">Facebook</a>
                <a href="https://twitter.com/vacua">Twitter</a>
                <a href="https://linkedin.com/company/vacua">LinkedIn</a>
                <a href="https://instagram.com/vacua">Instagram</a>
            </div>
            <p>&copy; ${new Date().getFullYear()} Vacua. All rights reserved.</p>
            <div class="footer-links">
                <a href="https://vacua.com">Website</a> |
                <a href="https://vacua.com/privacy">Privacy Policy</a> |
                <a href="https://vacua.com/terms">Terms of Service</a> |
                <a href="https://vacua.com/help">Help Center</a>
            </div>
            <div class="contact-info">
                <p>Questions? Contact us at support@vacua.com</p>
                <p>Vacua Technologies Inc., 123 Tech Street, Silicon Valley, CA 94025</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

const getVerificationEmailTemplate = (otp) => {
    const content = `
        <div class="content">
            <p>Dear User,</p>
            <p>Thank you for registering with <strong>Vacua</strong>! To complete your registration, please use the verification code below:</p>
            <p class="otp">${otp}</p>
            <div class="divider"></div>
            <p>If you did not request this verification, please ignore this email.</p>
            <p>Best regards,<br>The Vacua Team</p>
        </div>
    `;
    return baseEmailTemplate('Email Verification', content);
};

const getPasswordResetEmailTemplate = (otp) => {
    const content = `
        <div class="content">
            <p>Dear User,</p>
            <p>We received a request to reset your password. Please use the verification code below to proceed:</p>
            <p class="otp">${otp}</p>
            <div class="divider"></div>
            <p>If you did not request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The Vacua Security Team</p>
        </div>
    `;
    return baseEmailTemplate('Password Reset', content);
};

const getWelcomeEmailTemplate = (username) => {
    const content = `
        <div class="content">
            <p>Dear ${username},</p>
            <p>Welcome to Vacua! We're thrilled to have you as a member of our community.</p>
            <p>With your new account, you can:</p>
            <ul>
                <li>Connect with other members</li>
                <li>Access exclusive features</li>
                <li>Stay updated with our latest offerings</li>
            </ul>
            <div class="divider"></div>
            <p>If you have any questions or need assistance, our support team is always here to help.</p>
            <p>Best regards,<br>The Vacua Team</p>
        </div>
    `;
    return baseEmailTemplate('Welcome to Vacua', content);
};

const getLoginNotificationTemplate = (username, loginTime, deviceInfo) => {
    const content = `
        <div class="content">
            <p>Dear ${username},</p>
            <p>We detected a new login to your Vacua account.</p>
            
            <div class="login-details">
                <p><strong>Time:</strong> ${loginTime}</p>
                <p><strong>Device Info:</strong> ${deviceInfo}</p>
            </div>
            
            <p>If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately by:</p>
            <ol>
                <li>Changing your password</li>
                <li>Enabling two-factor authentication if not already enabled</li>
                <li>Contacting our support team</li>
            </ol>
            <div class="divider"></div>
            <p>Best regards,<br>The Vacua Security Team</p>
        </div>
    `;
    return baseEmailTemplate('New Login Detected', content);
};

export const emailTemplates = {
    verificationEmail: (otp) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Email Verification</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #4A90E2; font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 5px;">
                ${otp}
            </h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
                This is an automated message, please do not reply.
            </p>
        </div>
    `,

    studentVerificationEmail: ({ fullName, verificationId }) => `
        <h2>Student Verification Required</h2>
        <p>Dear ${fullName},</p>
        <p>Please complete your student verification by uploading:</p>
        <ul>
            <li>Student ID</li>
            <li>Enrollment proof</li>
        </ul>
        <p>Verification ID: ${verificationId}</p>
    `,

    businessVerificationEmail: ({ companyName, verificationId }) => `
        <h2>Business Verification Required</h2>
        <p>Dear ${companyName} Representative,</p>
        <p>Please complete your business verification by uploading:</p>
        <ul>
            <li>Business registration certificate</li>
            <li>Tax ID document</li>
            <li>Representative's ID</li>
        </ul>
        <p>Verification ID: ${verificationId}</p>
    `,

    propertyVerificationEmail: ({ fullName, propertyAddress, verificationId }) => `
        <h2>Property Ownership Verification Required</h2>
        <p>Dear ${fullName},</p>
        <p>Please verify your ownership of property at:</p>
        <p>${propertyAddress}</p>
        <p>Required documents:</p>
        <ul>
            <li>Property ownership proof</li>
            <li>Recent utility bill</li>
            <li>Authorization letter (if applicable)</li>
        </ul>
        <p>Verification ID: ${verificationId}</p>
    `,

    verificationStatusEmail: ({ fullName, status, reason }) => `
        <h2>Verification Status Update</h2>
        <p>Dear ${fullName},</p>
        <p>Your verification status has been updated to: <strong>${status}</strong></p>
        ${reason ? `<p>Reason: ${reason}</p>` : ''}
    `,

    passwordResetEmail: getPasswordResetEmailTemplate,
    welcomeEmail: getWelcomeEmailTemplate,
    loginNotification: getLoginNotificationTemplate,
    passwordChangeNotification: (username) => `
        <h2>Password Changed Successfully</h2>
        <p>Hello ${username},</p>
        <p>Your password was successfully changed. If you did not make this change, please contact support immediately.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <p>Best regards,<br>Your App Team</p>
    `
}; 