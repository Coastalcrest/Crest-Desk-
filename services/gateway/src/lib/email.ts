import { ServerClient } from 'postmark';
import { logger } from './logger';

const postmark = process.env.POSTMARK_SERVER_TOKEN
  ? new ServerClient(process.env.POSTMARK_SERVER_TOKEN)
  : null;

export async function sendEmail(options: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
}): Promise<void> {
  if (!postmark) {
    logger.warn(
      { to: options.to, subject: options.subject },
      'Postmark not configured, skipping email',
    );
    return;
  }

  await postmark.sendEmail({
    From: process.env.EMAIL_FROM ?? 'noreply@coastalcrest.net',
    To: options.to,
    Subject: options.subject,
    HtmlBody: options.htmlBody,
    TextBody: options.textBody,
    Tag: options.tag,
    TrackOpens: true,
    TrackLinks: 'HtmlAndText' as any,
    MessageStream: 'outbound',
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
  await sendEmail({
    to,
    subject: 'Reset Your CrestDesk Password',
    htmlBody: `
      <h2>Reset Your Password</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}" style="background-color: #1B3A5C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    textBody: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    tag: 'password-reset',
  });
}

export async function sendInviteEmail(
  to: string,
  inviterName: string,
  tenantName: string,
  inviteToken: string,
): Promise<void> {
  const inviteUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/register?invite=${inviteToken}`;
  await sendEmail({
    to,
    subject: `You've been invited to join ${tenantName} on CrestDesk`,
    htmlBody: `
      <h2>You're Invited!</h2>
      <p>${inviterName} has invited you to join <strong>${tenantName}</strong> on CrestDesk.</p>
      <p><a href="${inviteUrl}" style="background-color: #1B3A5C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
      <p>This invitation expires in 7 days.</p>
    `,
    textBody: `${inviterName} has invited you to join ${tenantName} on CrestDesk.\n\nAccept: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
    tag: 'invite',
  });
}

export async function sendVerificationEmail(
  to: string,
  verifyToken: string,
): Promise<void> {
  const verifyUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/verify-email?token=${verifyToken}`;
  await sendEmail({
    to,
    subject: 'Verify Your CrestDesk Email',
    htmlBody: `
      <h2>Verify Your Email</h2>
      <p>Welcome to CrestDesk! Please verify your email address:</p>
      <p><a href="${verifyUrl}" style="background-color: #1B3A5C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
    textBody: `Verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    tag: 'email-verification',
  });
}
