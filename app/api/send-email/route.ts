import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  handleError,
  AppError,
  checkRateLimit,
  logAction,
} from '@/lib/error-handler';
import { z } from 'zod';

// Initialize Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const SendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject too short').max(200, 'Subject too long'),
  body: z.string().min(10, 'Body too short').max(10000, 'Body too long'),
  type: z.string().optional().default('standard'),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      throw new AppError(401, 'Unauthorized. Please log in.', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);
    const userEmail = session.user.email;

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      throw new AppError(
        500,
        'Email service not configured',
        'EMAIL_SERVICE_ERROR'
      );
    }

    // Rate limiting: 20 emails per hour
    checkRateLimit(`send-email:${userId}`, 20, 3600000);

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON format', 'INVALID_JSON');
    }

    // Validate schema
    const validatedData = SendEmailSchema.parse(body);

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@coldmailai.com',
        to: validatedData.to,
        subject: validatedData.subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">ColdMailAI</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">AI-Powered Cold Email</p>
              </div>
              <div style="background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
                <div style="margin-bottom: 20px;">
                  ${validatedData.body
                    .split('\n')
                    .map((line: string) => `<p style="margin: 10px 0;">${line}</p>`)
                    .join('')}
                </div>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px; color: #666; font-size: 12px;">
                  <p style="margin: 5px 0;">Sent via <strong>ColdMailAI</strong></p>
                  <p style="margin: 5px 0;">From: ${userEmail}</p>
                </div>
              </div>
            </div>
          </div>
        `,
        reply_to: userEmail,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logAction('EMAIL_SEND_FAILED', userId, {
        to: validatedData.to,
        error: error.message,
      });
      throw new AppError(
        response.status,
        `Failed to send email: ${error.message}`,
        'EMAIL_SEND_ERROR'
      );
    }

    const resendResponse = await response.json();

    // Log successful send
    logAction('EMAIL_SENT', userId, {
      to: validatedData.to,
      subject: validatedData.subject,
      resendId: resendResponse.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Email sent successfully',
        emailId: resendResponse.id,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
