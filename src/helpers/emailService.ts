import colors from 'colors';
import nodemailer from 'nodemailer';
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { config } from '../config';

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: Number(config.smtp.port),
  secure: false,
  auth: {
    user: config.smtp.username,
    pass: config.smtp.password,
  },
});

// Verify transporter connection
if (config.environment !== 'test') {
  transporter
    .verify()
    .then(() => logger.info(colors.cyan('📧  Connected to email server')))
    .catch(err =>
      logger.warn(
        'Unable to connect to email server. Make sure you have configured the SMTP options in .env'
      )
    );
}

// ✨ REVISED: A more robust template to match the desired design.
const createStyledEmailTemplate = (
  title: string,
  body: string
): string => {
  const logoUrl = 'https://i.ibb.co/RpMRDQFW/AIM-20-20-Transparent-20-PNG-20-white.png';

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


// Function to send email
const sendEmail = async (values: ISendEmail) => {
  try {
    const info = await transporter.sendMail({
      from: `${config.smtp.emailFrom}`,
      to: values.to,
      subject: values.subject,
      html: values.html,
    });
    logger.info('Mail sent successfully', info.accepted);
  } catch (error) {
    errorLogger.error('Email', error);
  }
};

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
  tempPassword: string
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
  message?: string
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
  message: string
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
