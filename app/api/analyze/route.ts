import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapeWebsite, extractDomain } from '@/lib/scraper';
import { analyzeProspect } from '@/lib/gemini';
import { decrementCredits, getUserCredits, saveUserResearch } from '@/lib/db';
import {
  handleError,
  AppError,
  checkRateLimit,
  logAction,
  withRetry,
} from '@/lib/error-handler';
import { AnalyzeSchema, validateInput, checkMaliciousPatterns } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized. Please log in.', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Rate limiting
    checkRateLimit(`analyze:${userId}`, 20, 3600000); // 20 requests per hour

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON format', 'INVALID_JSON');
    }

    // Validate against schema
    const { url, service } = await validateInput(AnalyzeSchema, body);

    // Check for malicious patterns
    const maliciousCheck = checkMaliciousPatterns(service);
    if (maliciousCheck) {
      logAction('MALICIOUS_PATTERN_DETECTED', userId, { service, reason: maliciousCheck });
      throw new AppError(400, 'Input contains potentially malicious content', 'MALICIOUS_INPUT');
    }

    // Check credits
    const credits = await withRetry(() => getUserCredits(userId), 2);
    
    if (credits <= 0) {
      throw new AppError(
        402,
        'Insufficient credits. Please purchase more credits to continue.',
        'INSUFFICIENT_CREDITS'
      );
    }

    // Scrape website with retry
    let content: string | null = null;
    try {
      content = await withRetry(() => scrapeWebsite(url), 2, 500);
    } catch (error) {
      logAction('SCRAPE_FAILED', userId, { url, error: String(error) });
      throw new AppError(
        400,
        'Could not scrape website. Please verify the URL is correct and the site is publicly accessible.',
        'SCRAPE_FAILED'
      );
    }

    if (!content || content.trim().length === 0) {
      throw new AppError(
        400,
        'No content found on the website. Please try another URL.',
        'NO_CONTENT'
      );
    }

    // Extract domain with validation
    let domain: string | null = null;
    try {
      domain = await extractDomain(url);
    } catch (error) {
      logAction('DOMAIN_EXTRACT_FAILED', userId, { url });
      throw new AppError(400, 'Could not extract domain from URL', 'INVALID_URL');
    }

    if (!domain) {
      throw new AppError(400, 'Invalid URL format', 'INVALID_URL');
    }

    // Analyze with Gemini with retry
    let analysis: any;
    try {
      analysis = await withRetry(() => analyzeProspect(domain, content!, service), 2, 1000);
    } catch (error) {
      logAction('ANALYSIS_FAILED', userId, { domain, error: String(error) });
      throw new AppError(
        503,
        'AI analysis service temporarily unavailable. Please try again later.',
        'AI_SERVICE_ERROR'
      );
    }

    if (!analysis || !analysis.angles || analysis.angles.length === 0) {
      throw new AppError(
        500,
        'Analysis returned no valid angles. Please try another URL.',
        'EMPTY_ANALYSIS'
      );
    }

    // Decrement credits with error handling
    try {
      await withRetry(() => decrementCredits(userId), 2);
    } catch (error) {
      logAction('CREDIT_DECREMENT_FAILED', userId, { error: String(error) });
      throw new AppError(
        500,
        'Failed to process credits. Please contact support.',
        'CREDIT_ERROR'
      );
    }

    // Save research history
    try {
      await saveUserResearch(userId, url, service, analysis.angles);
    } catch (error) {
      // Log but don't fail - history is secondary
      logAction('HISTORY_SAVE_FAILED', userId, { url, error: String(error) });
    }

    logAction('ANALYSIS_SUCCESS', userId, { domain, angles: analysis.angles.length });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    return handleError(error);
  }
}
