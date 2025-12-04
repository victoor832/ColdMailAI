import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateEmails } from '@/lib/gemini';
import { updateResearchEmails } from '@/lib/db';
import {
  handleError,
  AppError,
  checkRateLimit,
  logAction,
  withRetry,
} from '@/lib/error-handler';
import { GenerateEmailsSchema, validateInput } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized. Please log in.', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Rate limiting
    checkRateLimit(`generate-emails:${userId}`, 30, 3600000); // 30 requests per hour

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON format', 'INVALID_JSON');
    }

    // Validate against schema
    const { url, angle } = await validateInput(GenerateEmailsSchema, body);

    // Generate emails with retry
    let emails: any;
    try {
      emails = await withRetry(
        () => generateEmails(url, angle.hook, angle.evidence, ''),
        2,
        1000
      );
    } catch (error) {
      logAction('EMAIL_GENERATION_FAILED', userId, { error: String(error) });
      throw new AppError(
        503,
        'Email generation service temporarily unavailable. Please try again later.',
        'EMAIL_GEN_ERROR'
      );
    }

    if (!emails) {
      throw new AppError(
        500,
        'Failed to generate emails. Please try again.',
        'EMPTY_EMAIL_GENERATION'
      );
    }

    // Save generated emails to database - non-blocking
    try {
      await withRetry(() => updateResearchEmails(userId, url, emails), 1);
    } catch (dbError) {
      logAction('EMAIL_SAVE_FAILED', userId, { url, error: String(dbError) });
      // Continue - generation was successful, saving is secondary
    }

    logAction('EMAIL_GENERATION_SUCCESS', userId, { url });

    return NextResponse.json({
      success: true,
      data: emails,
    });
  } catch (error) {
    return handleError(error);
  }
}
