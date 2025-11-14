// src/helpers/emailService.ts

import colors from 'colors';
import sgMail from '@sendgrid/mail'; // 💡 CHANGED: Import SendGrid
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { config } from '../config';

// 💡 CHANGED: Initialize SendGrid
const sendgridApiKey = config.sendgrid?.apiKey || process.env.SENDGRID_API_KEY;

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
  logger.info(colors.cyan('📧 SendGrid email client initialized'));
} else {
  logger.warn(
    'SENDGRID_API_KEY not found. Email services will be disabled. Make sure you have configured the environment variable.',
  );
}

// 💡 REMOVED: All Resend client code

// Shared HTML template
const createStyledEmailTemplate = (
  title: string,
  body: string,
): string => {
  const logoUrl =
    'https://i.ibb.co/RpMRDQFW/AIM-20-20-Transparent-20-PNG-20-white.png';

  // ... (Your entire HTML template string)
  // ... (NO CHANGES NEEDED HERE)
  // ...
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Figtree', Arial, sans-serif; background-color: #ffffff; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f7f7f7; padding-bottom: 60px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #1a1a1a; }
        .top-part { background-color: #f0f0f0; height: 150px; text-align: center; }
        .logo-circle { background-color: #F9A825; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto; line-height: 80px; }
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
          <tr>
            <td class="top-part"></td>
          </tr>
          <tr>
            <td style="padding: 0 20px;">
              <table style="width:100%; background-color:#ffffff; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.07); margin-top: -70px;">
                <tr>
                  <td style="padding-top: 30px; text-align:center;">
                    <div class="logo-circle">
                      <img src="${logoUrl}" alt="Aim Construction Logo">
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

// 💡 CHANGED: Core sendEmail helper now uses SendGrid
const sendEmail = async (values: ISendEmail) => {
  if (!sendgridApiKey) {
    errorLogger.error('📧 [EMAIL ERROR] Cannot send email: SENDGRID_API_KEY is not configured.');
    return;
  }
  
  const fromEmail = config.smtp.emailFrom || 'noreply@aimconstructionmgt.com';

  // 💡 CHANGED: This is the SendGrid message object
  const msg = {
    to: values.to,
    from: {
      name: 'AIM Construction',
      email: fromEmail, // Must be from your verified domain
    },
    subject: values.subject,
    html: values.html,
  };

  try {
    logger.info(
      `📧 [EMAIL] Sending email... from=${fromEmail} to=${values.to} subject=${values.subject}`,
    );

    // 💡 CHANGED: Use the SendGrid API
    await sgMail.send(msg);

    logger.info(
      `📧 [EMAIL] Mail sent successfully via SendGrid to ${values.to}`,
    );
  } catch (error: any) { // 💡 CHANGED: Typed 'error' as 'any' to access properties
    // 💡 CHANGED: Better error logging for SendGrid
    errorLogger.error('📧 [EMAIL ERROR] SendGrid API failed:', error.response?.body || error);
    // In dev/prod we WANT to know email is broken, so let the caller see the failure.
    throw error;
  }
};

// --- NO CHANGES NEEDED BELOW THIS LINE ---
// All your existing functions will work perfectly with the new sendEmail function.

const sendVerificationEmail = async (to: string, otp: string) => {
  const subject = 'Your Verification Code';
  const title = 'Verification Code';
  const body = `
    <p>Here's your verification code:</p>
    <div class="otp-code">${otp}</div>
    <p style="font-size: 14px;">This code will expire soon.</p>
  `;
  const html = createStyledEmailTemplate(title, body);
  await sendEmail({ to, subject, html });
};

const sendResetPasswordEmail = async (to: string, otp: string) => {
  const subject = 'Your Password Reset Code';
  const title = 'Password Reset';
  const body = `
    <p>Here's your password reset code:</p>
    <div class="otp-code">${otp}</div>
    <p style="font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
  `;
  const html = createStyledEmailTemplate(title, body);
  await sendEmail({ to, subject, html });
};

const sendSupervisorInviteEmail = async (
  to: string,
  managerName: string,
  tempPassword: string,
) => {
  const subject = `You've been invited to join Aim Construction`;
  const title = "You're Invited!";
  const body = `
    <p>Your manager, <strong>${managerName}</strong>, has invited you to join their team. An account has been created for you.</p>
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <p style="font-size: 16px; margin: 10px 0;"><strong>Email:</strong> <span style="color: #F9A825;">${to}</span></p>
      <p style="font-size: 16px; margin: 10px 0;"><strong>Temporary Password:</strong> <span style="color: #F9A825; font-weight: bold;">${tempPassword}</span></p>
    </div>
    <p>For security reasons, please log in and change your password immediately.</p>
  `;
  const html = createStyledEmailTemplate(title, body);
  await sendEmail({ to, subject, html });
};

const sendAdminOrSuperAdminCreationEmail = async (
  email: string,
  role: string,
  password: string,
  message?: string,
) => {
  const subject = `Congratulations! You are now an ${role}`;
  const title = `Welcome, ${role}!`;
  const body = `
    <p>An account has been created for you on the Aim Construction platform. Use the credentials below to log in:</p>
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <p style="font-size: 16px; margin: 10px 0;"><strong>Email:</strong> <span style="color: #F9A825;">${email}</span></p>
      <p style="font-size: 16px; margin: 10px 0;"><strong>Temporary Password:</strong> <span style="color: #F9A825; font-weight: bold;">${password}</span></p>
    </div>
    ${message ? `<p>${message}</p>` : ''}
    <p>For security reasons, please log in and change your password immediately.</p>
  `;
  const html = createStyledEmailTemplate(title, body);
  await sendEmail({ to: email, subject, html });
};

const sendWelcomeEmail = async (to: string, password: string) => {
  const subject = 'Welcome to Aim Construction!';
  const title = 'Welcome Aboard!';
  const body = `
    <p>We are excited to have you join us. Your account has been created successfully. Use the following credentials to log in:</p>
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <p style="font-size: 16px; margin: 10px 0;"><strong>Email:</strong> <span style="color: #F9A825;">${to}</span></p>
      <p style="font-size: 16px; margin: 10px 0;"><strong>Temporary Password:</strong> <span style="color: #F9A825; font-weight: bold;">${password}</span></p>
    </div>
    <p>For security reasons, please log in and change your password immediately.</p>
  `;
  const html = createStyledEmailTemplate(title, body);
  await sendEmail({ to, subject, html });
};

const sendSupportMessageEmail = async (
  userEmail: string,
  userName: string,
  subject: string,
  message: string,
) => {
  const adminEmail = config.smtp.emailFrom;
  const title = 'New Support Message';
  const body = `
    <p>From: <strong>${userName}</strong> (${userEmail})</p>
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: left;">
      <p style="font-size: 16px; margin: 10px 0;"><strong>Subject:</strong> ${subject}</p>
      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 15px 0;">
      <p style="font-size: 16px; margin: 10px 0;">${message}</p>
    </div>
    <p>Please respond to the user as soon as possible.</p>
  `;
  const html = createStyledEmailTemplate(title, body);
  await sendEmail({
    to: adminEmail || '',
    subject: `Support Request from ${userName}`,
    html,
  });
};

export {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendAdminOrSuperAdminCreationEmail,
  sendSupportMessageEmail,
  sendWelcomeEmail,
  sendSupervisorInviteEmail,
};