// src/helpers/emailService.ts

import colors from 'colors';
import { Resend } from 'resend'; // 💡 CHANGED: Import Resend
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { config } from '../config';

// 💡 CHANGED: Initialize Resend client
// Make sure RESEND_API_KEY is in your Render environment variables
// and mapped to config.resend.apiKey (or similar) in your config.ts
// For simplicity, I'll use process.env directly here if config isn't set up for it.
const resendApiKey = config.resend?.apiKey || process.env.RESEND_API_KEY;

let resend: Resend;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
  logger.info(colors.cyan('📧 Resend email client initialized'));
} else {
  logger.warn(
    'RESEND_API_KEY not found. Email services will be disabled. Make sure you have configured the environment variable.',
  );
  // Create a mock/disabled client if you want to avoid errors
  resend = {} as Resend; // This will fail, but highlights the config issue
}

// 💡 REMOVED: All Nodemailer transporter and transporter.verify() code

// Shared HTML template
const createStyledEmailTemplate = (
  title: string,
  body: string,
): string => {
  const logoUrl =
    'https://i.ibb.co/RpMRDQFW/AIM-20-20-Transparent-20-PNG-20-white.png';

  // ... (Your entire HTML template string)
  // ... (NO CHANGES NEEDED HERE, so I'll trim it for the example)
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

// 💡 CHANGED: Core sendEmail helper now uses Resend
const sendEmail = async (values: ISendEmail) => {
  if (!resendApiKey) {
    errorLogger.error('📧 [EMAIL ERROR] Cannot send email: RESEND_API_KEY is not configured.');
    // Don't throw, or it might crash the app, but log it clearly.
    return;
  }
  
  const fromEmail = config.smtp.emailFrom || 'noreply@aimconstructionmgt.com';

  try {
    logger.info(
      `📧 [EMAIL] Sending email... from=${fromEmail} to=${values.to} subject=${values.subject}`,
    );

    // Use the Resend API
    const { data, error } = await resend.emails.send({
      from: `AIM Construction <${fromEmail}>`, // Must be from your verified domain
      to: [values.to], // Resend API expects an array
      subject: values.subject,
      html: values.html,
    });

    if (error) {
      errorLogger.error('📧 [EMAIL ERROR] Resend API failed:', error);
      throw error; // Throw the error so the caller can catch it
    }

    logger.info(
      `📧 [EMAIL] Mail sent successfully. messageId=${data.id}`,
    );
  } catch (error) {
    errorLogger.error('📧 [EMAIL ERROR] Failed to send email', error);
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