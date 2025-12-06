import colors from 'colors';
import sgMail from '@sendgrid/mail';
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { config } from '../config';

// -------------------- SendGrid Setup --------------------
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  logger.error('SENDGRID_API_KEY is not set. Emails will not be sent.');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  logger.info(colors.cyan('📧  SendGrid initialized'));
}

// From address (must be verified in SendGrid)
const FROM_EMAIL = config.smtp?.emailFrom || 'noreply@aimconstructionmgt.com';

// Public logo URL (GitHub raw file)
const LOGO_URL =
  'https://raw.githubusercontent.com/Brandonnn3/AIM_Backend/main/src/Assets/appLogo.png';

// -------------------- Email Template --------------------
const createStyledEmailTemplate = (title: string, body: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Figtree', Arial, sans-serif; background-color: #ffffff; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f7f7f7; padding-bottom: 60px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #1a1a1a; }
        .top-part { background-color: #f0f0f0; height: 150px; text-align: center; }
        .logo-circle { background-color: #232323ff; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto; line-height: 80px; }
        .logo-circle img { width: 50px; height: auto; vertical-align: middle; }
        .content { padding: 40px; text-align: center; }
        .content h1 { font-size: 32px; margin-top: 0; margin-bottom: 30px; font-weight: 700; }
        .content p { font-size: 16px; line-height: 1.6; color: #555555; }
        .otp-code { color: #1a1a1a; font-size: 48px; font-weight: bold; padding: 15px 25px; display: inline-block; margin: 20px 0; letter-spacing: 10px; }
        .footer { text-align: center; font-size: 12px; color: #888888; padding: 20px 0; }
      </style>
    </head>
    <body>
      <center class="wrapper">
        <table class="main" width="100%">
          <!-- TOP GRAY BACKGROUND -->
          <tr>
            <td class="top-part"></td>
          </tr>
          <!-- WHITE CONTENT AREA -->
          <tr>
            <td style="padding: 0 20px;">
              <table style="width:100%; background-color:#ffffff; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.07); margin-top: -70px;">
                <tr>
                  <td style="padding-top: 30px; text-align:center;">
                    <div class="logo-circle">
                      <img src="${LOGO_URL}" alt="Aim Construction Logo" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <h1>${title}</h1>
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td class="footer">
              <p>&copy; ${new Date().getFullYear()} Aim Construction. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </center>
    </body>
    </html>
  `;
};

// -------------------- Core Send Function --------------------
const sendEmail = async (values: ISendEmail) => {
  try {
    logger.info(
      `Attempting to send email via SendGrid to: ${values.to}, subject: ${values.subject}`
    );

    const msg = {
      to: values.to,
      from: {
        email: FROM_EMAIL,
        name: 'Aim Construction',
      },
      subject: values.subject,
      html: values.html,
    };

    const [response] = await sgMail.send(msg);
    logger.info(
      `Mail sent successfully via SendGrid to ${values.to} (status=${response.statusCode})`
    );
  } catch (error: any) {
    logger.error('Email send error via SendGrid', error);

    // Helpful extra logging if SendGrid returns details
    if (error.response?.body) {
      logger.error('SendGrid error body', error.response.body);
    }

    errorLogger.error('Email send error via SendGrid', error);
  }
};

// -------------------- Email Variants --------------------
const sendVerificationEmail = async (to: string, otp: string) => {
  const html = createStyledEmailTemplate(
    'Verification Code',
    `
      <p>Here's your verification code:</p>
      <div class="otp-code">${otp}</div>
      <p style="font-size: 14px;">This code will expire soon.</p>
    `
  );
  await sendEmail({ to, subject: 'Your Verification Code', html });
};

const sendResetPasswordEmail = async (to: string, otp: string) => {
  const html = createStyledEmailTemplate(
    'Password Reset',
    `
      <p>Here's your password reset code:</p>
      <div class="otp-code">${otp}</div>
      <p style="font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    `
  );
  await sendEmail({ to, subject: 'Your Password Reset Code', html });
};

const sendSupervisorInviteEmail = async (
  to: string,
  managerName: string,
  tempPassword: string
) => {
  const html = createStyledEmailTemplate(
    "You're Invited!",
    `
      <p>Your manager, <strong>${managerName}</strong>, has invited you to join their team. An account has been created for you.</p>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
        <p><strong>Email:</strong> <span style="color:#F9A825;">${to}</span></p>
        <p><strong>Temporary Password:</strong> <span style="color:#F9A825; font-weight:bold;">${tempPassword}</span></p>
      </div>
      <p>Please log in and change your password immediately.</p>
    `
  );
  await sendEmail({ to, subject: `You've been invited to join Aim Construction`, html });
};

const sendAdminOrSuperAdminCreationEmail = async (
  email: string,
  role: string,
  password: string,
  message?: string
) => {
  const html = createStyledEmailTemplate(
    `Welcome, ${role}!`,
    `
      <p>An account has been created for you. Use the credentials below:</p>
      <div style="background-color:#f9f9f9; padding:20px; border-radius:8px; margin:30px 0; text-align:center;">
        <p><strong>Email:</strong> <span style="color:#F9A825;">${email}</span></p>
        <p><strong>Temporary Password:</strong> <span style="color:#F9A825; font-weight:bold;">${password}</span></p>
      </div>
      ${message || ''}
      <p>Please log in and change your password immediately.</p>
    `
  );
  await sendEmail({ to: email, subject: `Congratulations! You are now an ${role}`, html });
};

const sendWelcomeEmail = async (to: string, password: string) => {
  const html = createStyledEmailTemplate(
    'Welcome Aboard!',
    `
      <p>Your account has been created successfully. Use your credentials below:</p>
      <div style="background-color:#f9f9f9; padding:20px; border-radius:8px; margin:30px 0; text-align:center;">
        <p><strong>Email:</strong> <span style="color:#F9A825;">${to}</span></p>
        <p><strong>Temporary Password:</strong> <span style="color:#F9A825; font-weight:bold;">${password}</span></p>
      </div>
      <p>Please log in and change your password immediately.</p>
    `
  );
  await sendEmail({ to, subject: 'Welcome to Aim Construction!', html });
};

const sendSupportMessageEmail = async (
  userEmail: string,
  userName: string,
  subject: string,
  message: string
) => {
  const adminEmail = FROM_EMAIL;

  const html = createStyledEmailTemplate(
    'New Support Message',
    `
      <p>From: <strong>${userName}</strong> (${userEmail})</p>
      <div style="background-color:#f9f9f9; padding:20px; border-radius:8px; margin:30px 0;">
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p>${message}</p>
      </div>
      <p>Please respond to the user as soon as possible.</p>
    `
  );

  await sendEmail({
    to: adminEmail ?? '',
    subject: `Support Request from ${userName}`,
    html,
  });
};

// -------------------- Exports --------------------
export {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendAdminOrSuperAdminCreationEmail,
  sendSupportMessageEmail,
  sendWelcomeEmail,
  sendSupervisorInviteEmail,
};
