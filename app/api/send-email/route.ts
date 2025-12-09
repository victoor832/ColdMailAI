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
  // Simple deterministic hash for logging - not for security
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0; // Convert to 32-bit signed integer
  }
  return `hash_${Math.abs(hash).toString(36).substring(0, 8)}`;
}

// Initialize Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const SendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject too short').max(200, 'Subject too long'),
  body: z.string().min(10, 'Body too short').max(10000, 'Body too long'),
});

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
        from: process.env.RESEND_FROM_EMAIL || 'noreply@mail.readytorelease.online',
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

    if (!response.ok) {
      let errorMessage = 'Unknown error from email service';
      let rawBody = '';

      try {
        // Read response body once as text
        rawBody = await response.text();
        
        // Try to parse as JSON to extract error message
        if (rawBody) {
          try {
            const errorJson = JSON.parse(rawBody);
            errorMessage = errorJson.message || errorJson.error || rawBody || `HTTP ${response.status}`;
          } catch {
            // JSON parse failed, use raw text as error message
            errorMessage = rawBody || `HTTP ${response.status}`;
          }
        } else {
          errorMessage = `HTTP ${response.status}`;
        }
      } catch (readError) {
        errorMessage = `HTTP ${response.status}: Failed to read error response`;
      }

      logAction('EMAIL_SEND_FAILED', userId, {
        recipientHash: hashSensitiveValue(validatedData.to),
        error: errorMessage,
        status: response.status,
        rawBody: rawBody.substring(0, 500), // Limit to first 500 chars for logging
      });
      throw new AppError(
        response.status,
        `Failed to send email: ${errorMessage}`,
        'EMAIL_SEND_ERROR'
      );
    }

    let resendResponse: any;
    try {
      resendResponse = await response.json();
    } catch (parseError) {
      // JSON parsing failed - capture raw response text for diagnostics
      let rawResponseText = '';
      try {
        rawResponseText = await response.text();
      } catch {
        rawResponseText = '(unable to read response body)';
      }

      logAction('EMAIL_RESPONSE_PARSE_ERROR', userId, {
        recipientHash: hashSensitiveValue(validatedData.to),
        error: 'Failed to parse successful response as JSON',
        parseError: String(parseError),
        rawResponse: rawResponseText.substring(0, 500), // Limit to first 500 chars
      });
      throw new AppError(
        500,
        'Email sent but failed to parse response',
        'EMAIL_RESPONSE_ERROR'
      );
    }

    // Log successful send - without storing raw PII
    logAction('EMAIL_SENT', userId, {
      recipientHash: hashSensitiveValue(validatedData.to),
      subjectHash: hashSensitiveValue(validatedData.subject),
      resendId: resendResponse.id,
      status: 'sent',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Email sent successfully',
        emailId: resendResponse.id,
        from: process.env.RESEND_FROM_EMAIL || 'noreply@mail.readytorelease.online',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
