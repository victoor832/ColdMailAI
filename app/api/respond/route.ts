import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleResponse } from '@/lib/gemini';
import { saveUserResponse, saveGlobalResponse } from '@/lib/db';
import {
  handleError,
  AppError,
  checkRateLimit,
  logAction,
  withRetry,
} from '@/lib/error-handler';
import { RespondSchema, validateInput, checkMaliciousPatterns } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized. Please log in.', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Rate limiting - respond is free so allow more requests
    checkRateLimit(`respond:${userId}`, 50, 3600000); // 50 requests per hour

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON format', 'INVALID_JSON');
    }

    // Validate against schema
    const { prospectResponse, originalEmail, angleUsed } = await validateInput(RespondSchema, body);

    // Check for malicious patterns
    const maliciousCheck = checkMaliciousPatterns(prospectResponse);
    if (maliciousCheck) {
      logAction('MALICIOUS_PATTERN_DETECTED', userId, { reason: maliciousCheck });
      throw new AppError(400, 'Input contains potentially malicious content', 'MALICIOUS_INPUT');
    }

    // Analyze response with Gemini - with retry
    let analysis: any;
    try {
      analysis = await withRetry(
        () => handleResponse(originalEmail, prospectResponse, angleUsed),
        2,
        1000
      );
    } catch (error) {
      logAction('RESPONSE_ANALYSIS_FAILED', userId, { error: String(error) });
      throw new AppError(
        503,
        'AI analysis service temporarily unavailable. Please try again later.',
        'AI_SERVICE_ERROR'
      );
    }

    if (!analysis) {
      throw new AppError(
        500,
        'Analysis returned no valid response. Please try again.',
        'EMPTY_ANALYSIS'
      );
    }

    // Save to user responses - with error handling but non-blocking
    try {
      await withRetry(
        () =>
          saveUserResponse(
            userId,
            angleUsed || 'unknown',
            analysis.analysis?.objectionType || '',
            analysis.analysis?.sentiment || '',
            analysis.analysis?.urgency || '',
            originalEmail || '',
            prospectResponse,
            analysis.replies
          ),
        1
      );
    } catch (error) {
      logAction('RESPONSE_SAVE_FAILED', userId, { error: String(error) });
      // Don't fail the request - analysis is more important than saving
    }

    // Save to global responses - with error handling but non-blocking
    try {
      await withRetry(
        () =>
          saveGlobalResponse(
            angleUsed || 'unknown',
            analysis.analysis?.objectionType || '',
            analysis.analysis?.sentiment || '',
            analysis.analysis?.urgency || ''
          ),
        1
      );
    } catch (error) {
      logAction('GLOBAL_RESPONSE_SAVE_FAILED', userId, { error: String(error) });
      // Don't fail the request - this is for benchmarks
    }

    logAction('RESPONSE_ANALYSIS_SUCCESS', userId, {
      sentiment: analysis.analysis?.sentiment,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    return handleError(error);
  }
}
