import nodemailer from "nodemailer";
import { logger } from "./logger";

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const transporter = getTransporter();

  if (transporter) {
    try {
      const from = process.env.SMTP_FROM || '"StaySmart Vacation Rentals" <noreply@staysmart.com>';
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      logger.info(`Email sent successfully to ${to} (Subject: ${subject})`);
      return;
    } catch (err: any) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(`SMTP sending failed: ${err.message}`);
      }
      logger.error(`Failed to send email to ${to} via SMTP: ${err.message}. Falling back to console logging.`);
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("SMTP server is not configured in production.");
  }

  // Fallback to beautiful console logger in development/fallback mode
  // eslint-disable-next-line no-console
  console.log(`
================================================================================
📧 [SMTP FALLBACK EMAIL DISPATCHED]
To: ${to}
Subject: ${subject}
--------------------------------------------------------------------------------
TEXT CONTENT:
${text}
================================================================================
  `);
}

export async function sendOTPEmail(to: string, otp: string) {
  const subject = "StaySmart - Verify Your Account";
  const text = `Your verification OTP is: ${otp}. This code is valid for 10 minutes.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 500px; color: #1f2937;">
      <h2 style="color: #4f46e5; margin-bottom: 20px;">StaySmart Account Verification</h2>
      <p>Thank you for registering on StaySmart. Please use the following One-Time Password (OTP) to verify your account:</p>
      <div style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #4f46e5; text-align: center; margin: 30px 0; background: #faf5ff; padding: 15px; border-radius: 8px;">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #6b7280;">This code is valid for 10 minutes. If you did not request this code, you can safely ignore this email.</p>
    </div>
  `;
  await sendEmail({ to, subject, html, text });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const subject = "StaySmart - Reset Password Request";
  const text = `Please reset your password by opening the following link: ${resetUrl}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 500px; color: #1f2937;">
      <h2 style="color: #4f46e5; margin-bottom: 20px;">Reset Password Request</h2>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: 700; border-radius: 8px; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 12px; color: #6b7280;">This link is valid for 1 hour. If you did not request a password reset, please secure your account.</p>
    </div>
  `;
  await sendEmail({ to, subject, html, text });
}

export async function sendBookingReceiptEmail(
  to: string,
  bookingDetails: {
    id: string;
    listingTitle: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    paymentId?: string;
  }
) {
  const subject = `StaySmart - Booking Confirmation (#${bookingDetails.id.substring(0, 8).toUpperCase()})`;
  const text = `Your stay at "${bookingDetails.listingTitle}" is confirmed from ${bookingDetails.startDate} to ${bookingDetails.endDate}. Total amount paid: ₹${bookingDetails.totalPrice}.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 500px; color: #1f2937;">
      <h2 style="color: #4f46e5; margin-bottom: 10px;">Booking Confirmed! 🎉</h2>
      <p>Thank you for choosing StaySmart. Your booking is confirmed.</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f3f4f6;">
        <h4 style="margin: 0 0 10px 0; color: #111827;">Reservation Details</h4>
        <p style="margin: 5px 0; font-size: 13px;"><strong>Stay:</strong> ${bookingDetails.listingTitle}</p>
        <p style="margin: 5px 0; font-size: 13px;"><strong>Check-In:</strong> ${bookingDetails.startDate}</p>
        <p style="margin: 5px 0; font-size: 13px;"><strong>Check-Out:</strong> ${bookingDetails.endDate}</p>
        <p style="margin: 5px 0; font-size: 13px;"><strong>Total Paid:</strong> ₹${bookingDetails.totalPrice}</p>
        ${bookingDetails.paymentId ? `<p style="margin: 5px 0; font-size: 13px;"><strong>Payment Reference:</strong> ${bookingDetails.paymentId}</p>` : ""}
      </div>

      <p style="font-size: 12px; color: #6b7280; text-align: center;">We look forward to hosting you! Safe travels.</p>
    </div>
  `;
  await sendEmail({ to, subject, html, text });
}

export async function sendBookingCancellationEmail(
  to: string,
  bookingDetails: {
    id: string;
    listingTitle: string;
    startDate: string;
    endDate: string;
    refundAmount: number;
  }
) {
  const subject = `StaySmart - Booking Cancelled (#${bookingDetails.id.substring(0, 8).toUpperCase()})`;
  const text = `Your booking for "${bookingDetails.listingTitle}" has been cancelled. Refund amount: ₹${bookingDetails.refundAmount}.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 500px; color: #1f2937;">
      <h2 style="color: #ef4444; margin-bottom: 10px;">Booking Cancelled</h2>
      <p>Your booking has been successfully cancelled. Here are the refund details:</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f3f4f6;">
        <h4 style="margin: 0 0 10px 0; color: #111827;">Cancellation Summary</h4>
        <p style="margin: 5px 0; font-size: 13px;"><strong>Stay:</strong> ${bookingDetails.listingTitle}</p>
        <p style="margin: 5px 0; font-size: 13px;"><strong>Dates:</strong> ${bookingDetails.startDate} to ${bookingDetails.endDate}</p>
        <p style="margin: 5px 0; font-size: 13px;"><strong>Refund Amount:</strong> ₹${bookingDetails.refundAmount}</p>
      </div>

      <p style="font-size: 12px; color: #6b7280;">If you paid via credit card/Razorpay, refunds typically take 5-7 business days to reflect in your account.</p>
    </div>
  `;
  await sendEmail({ to, subject, html, text });
}
