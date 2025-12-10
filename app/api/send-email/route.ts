import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  handleError,
  AppError,
  logAction,
} from '@/lib/error-handler';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// HTML escape function to prevent injection attacks
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// Hash function for consistent anonymization of sensitive values
function hashSensitiveValue(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0;
  }
  return `hash_${Math.abs(hash).toString(36).substring(0, 8)}`;
}

// Rate limits per plan (emails per month)
const RATE_LIMITS = {
  free: 10,
  pro: 500,
  unlimited: 999999,
};

// Initialize Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@mail.readytorelease.online';

const SendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject too short').max(200, 'Subject too long'),
  body: z.string().min(10, 'Body too short').max(10000, 'Body too long'),
});

// Get emails sent this month
async function getEmailsSentThisMonth(userId: string): Promise<number> {
  try {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'sent')
      .gte('created_at', firstDayOfMonth.toISOString());

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting emails sent:', error);
    return 0;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      throw new AppError(401, 'Unauthorized. Please log in.', 'UNAUTHORIZED');
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      throw new AppError(
        500,
        'Email service not configured',
        'EMAIL_SERVICE_ERROR'
      );
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON format', 'INVALID_JSON');
    }

    // Validate schema
    const validatedData = SendEmailSchema.parse(body);

    // Get user subscription plan for rate limiting
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_plan')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const plan = (userData.subscription_plan || 'free') as keyof typeof RATE_LIMITS;
    const limit = RATE_LIMITS[plan] || RATE_LIMITS.free;

    // Check rate limit
    const emailsSentThisMonth = await getEmailsSentThisMonth(userId);
    if (emailsSentThisMonth >= limit) {
      throw new AppError(
        429,
        `Email limit exceeded. You've sent ${emailsSentThisMonth}/${limit} emails this month.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Escape user inputs for HTML context
    const escapedUserEmail = escapeHtml(userEmail);
    const escapedBody = escapeHtml(validatedData.body);

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: validatedData.to,
        subject: validatedData.subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">ColdMailAI</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">AI-Powered Cold Email</p>
              </div>
              <div style="background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
                <div style="margin-bottom: 20px;">
                  ${escapedBody
                    .split('\n')
                    .map((line: string) => `<p style="margin: 10px 0;">${line}</p>`)
                    .join('')}
                </div>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px; color: #666; font-size: 12px;">
                  <p style="margin: 5px 0;">Sent via <strong>ColdMailAI</strong></p>
                  <p style="margin: 5px 0;">From: ${escapedUserEmail}</p>
                </div>
              </div>
            </div>
          </div>
        `,
        reply_to: userEmail,
      }),
    });

    let resendMessageId: string | null = null;
    let sendError: string | null = null;

    if (!response.ok) {
      let errorMessage = 'Unknown error from email service';
      let rawBody = '';

      try {
        rawBody = await response.text();
        console.error('Resend error response:', {
          status: response.status,
          body: rawBody,
        });
        if (rawBody) {
          try {
            const errorJson = JSON.parse(rawBody);
            errorMessage = errorJson.message || errorJson.error || rawBody || `HTTP ${response.status}`;
          } catch {
            errorMessage = rawBody || `HTTP ${response.status}`;
          }
        } else {
          errorMessage = `HTTP ${response.status}`;
        }
      } catch (readError) {
        errorMessage = `HTTP ${response.status}: Failed to read error response`;
      }

      sendError = errorMessage;
      logAction('EMAIL_SEND_FAILED', userId, {
        recipientHash: hashSensitiveValue(validatedData.to),
        error: errorMessage,
        status: response.status,
      });
    } else {
      try {
        const resendResponse = await response.json();
        resendMessageId = resendResponse.id;

        logAction('EMAIL_SENT', userId, {
          recipientHash: hashSensitiveValue(validatedData.to),
          subjectHash: hashSensitiveValue(validatedData.subject),
          resendId: resendMessageId,
          status: 'sent',
        });
      } catch (parseError) {
        sendError = 'Failed to parse response';
        logAction('EMAIL_RESPONSE_PARSE_ERROR', userId, {
          recipientHash: hashSensitiveValue(validatedData.to),
          error: String(parseError),
        });
      }
    }

    // Save to database regardless of send status
    try {
      const { error: insertError } = await supabase
        .from('email_sends')
        .insert([
          {
            user_id: userId,
            prospect_email: validatedData.to.toLowerCase().trim(),
            subject: validatedData.subject.trim(),
            body: validatedData.body.trim(),
            status: sendError ? 'failed' : 'sent',
            resend_message_id: resendMessageId,
            error_message: sendError,
          },
        ]);

      if (insertError) throw insertError;
    } catch (dbError) {
      console.error('Error saving email to database:', dbError);
      // Don't fail the response if DB save fails
    }

    // Return response
    if (sendError) {
      throw new AppError(500, `Failed to send email: ${sendError}`, 'EMAIL_SEND_ERROR');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email sent successfully',
        emailId: resendMessageId,
        emailsSent: emailsSentThisMonth + 1,
        limit,
        from: RESEND_FROM_EMAIL,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
