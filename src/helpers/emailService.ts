import colors from 'colors';
import nodemailer from 'nodemailer';
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { config } from '../config';

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: Number(config.smtp.port),
  secure: false, // true for 465, false for other ports
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

// Function to send email
const sendEmail = async (values: ISendEmail) => {
  try {
    const info = await transporter.sendMail({
      from: `${config.smtp.emailFrom}`, // sender address
      to: values.to, // list of receivers
      subject: values.subject, // subject line
      html: values.html, // html body
    });
    logger.info('Mail sent successfully', info.accepted);
  } catch (error) {
    errorLogger.error('Email', error);
  }
};

const sendVerificationEmail = async (to: string, otp: string) => {
  const subject = 'Verify Your Email Address';
  const html = `
    <div style="width: 45% ; margin: 0 auto ;font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${process.env.Ip_To_Acess_Upload_Folder}uploads/AIM_Transparent_PNG.png" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Email Verification</h1>
        <p style="font-size: 16px;">Thank you for signing up! Please verify your email address to complete the registration process. If you did not create an account with us, please disregard this email.</p>
      </div>
      <div style="text-align: center;">
        <h2 style="background-color: #f4f4f4; padding: 10px 20px; display: inline-block; border-radius: 5px; color: #1B9AAA; font-size: 35px;">${otp}</h2>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

const sendResetPasswordEmail = async (to: string, otp: string) => {
  const subject = 'Reset Your Password';
  const html = `
   <div style="width: 45% ; margin: 0 auto ;font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${process.env.Ip_To_Acess_Upload_Folder}uploads/AIM_Transparent_PNG.png" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Password Reset Request</h1>
        <p style="font-size: 16px;">We received a request to reset your password. Use the code below to proceed with resetting your password:</p>
      </div>
      <div style="text-align: center;">
        <h2 style="background-color: #f4f4f4; padding: 10px 20px; display: inline-block; border-radius: 5px; color: #1B9AAA; font-size: 35px;">${otp}</h2>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">This code is valid for 10 minutes. If you did not request a password reset, please disregard this email and contact support if needed.</p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

// NEW: This function creates and sends an invitation email to a new supervisor.
const sendSupervisorInviteEmail = async (
  to: string,
  managerName: string,
  tempPassword: string
) => {
  const subject = `You've been invited to join Aim Construction`;
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${process.env.Ip_To_Acess_Upload_Folder}uploads/AIM_Transparent_PNG.png" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">You're Invited!</h1>
        <p style="font-size: 16px;">Your manager, <strong>${managerName}</strong>, has invited you to join their team on the Aim Construction platform.</p>
        <p style="font-size: 16px;">An account has been created for you. Please use the credentials below to log in for the first time:</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 16px; font-weight: bold;">Email: <span style="color: #1B9AAA;">${to}</span></p>
        <p style="font-size: 16px; font-weight: bold;">Temporary Password: <span style="color: #1B9AAA;">${tempPassword}</span></p>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">For security reasons, please log in and change your password immediately.</p>
    </div>
  `;
  await sendEmail({ to, subject, html });
};


const sendAdminOrSuperAdminCreationEmail = async (
  email: string,
  role: string,
  password: string,
  message?: string
) => {
  const subject = `Congratulations! You are now an ${role}`;
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${process.env.Ip_To_Acess_Upload_Folder}uploads/AIM_Transparent_PNG.png" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Congratulations! You are now an ${role}</h1>
        <p style="font-size: 16px;">You have been granted ${role} access to the system. Use the credentials below to log in:</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 16px; font-weight: bold;">Email: <span style="color: #1B9AAA;">${email}</span></p>
        <p style="font-size: 16px; font-weight: bold;">Temporary Password: <span style="color: #1B9AAA;">${password}</span></p>
      </div>
      
      ${
        message
          ? `<div style="margin-top: 20px; padding: 15px; background-color: #f4f4f4; border-radius: 10px;">
              <p style="font-size: 14px; text-align: center; color: #555;">${message}</p>
            </div>`
          : ''
      }

      <p style="font-size: 14px; text-align: center; margin-top: 20px;">For security reasons, please log in and change your password immediately.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, html });
};

const sendWelcomeEmail = async (to: string, password: string) => {
  const subject = 'Welcome to the Platform!';
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${process.env.Ip_To_Acess_Upload_Folder}uploads/AIM_Transparent_PNG.png" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Welcome to the Platform!</h1>
        <p style="font-size: 16px;">We are excited to have you join us. Your account has been created successfully. Use the following credentials to log in:</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 16px; font-weight: bold;">Email: <span style="color: #1B9AAA;">${to}</span></p>
        <p style="font-size: 16px; font-weight: bold;">Temporary Password: <span style="color: #1B9AAA;">${password}</span></p>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">For security reasons, please log in and change your password immediately.</p>
    </div>
  `;
  await sendEmail({ to, subject, html });
};
const sendSupportMessageEmail = async (
  userEmail: string,
  userName: string,
  subject: string,
  message: string
) => {
  const adminEmail = config.smtp.emailFrom;
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${process.env.Ip_To_Acess_Upload_Folder}uploads/AIM_Transparent_PNG.png" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">New Support Message</h1>
        <p style="font-size: 16px;"><strong>From:</strong> ${userName} (${userEmail})</p>
        <p style="font-size: 16px;"><strong>Subject:</strong> ${subject}</p>
        <p style="font-size: 16px;">${message}</p>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">Please respond to the user as soon as possible.</p>
    </div>
  `;

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
  sendSupervisorInviteEmail, // NEW: Export the new function
};
