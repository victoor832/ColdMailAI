import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Handle API errors consistently
 */
export function handleError(error: unknown): NextResponse<ErrorResponse> {
  console.error('[ERROR]', error);

  // AppError - Expected errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Fetch/Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Network error. Please try again later.',
        code: 'NETWORK_ERROR',
      },
      { status: 503 }
    );
  }

  // Gemini API errors
  if (error instanceof Error && error.message.includes('Gemini')) {
    return NextResponse.json(
      {
        success: false,
        error: 'AI service temporarily unavailable. Please try again.',
        code: 'AI_SERVICE_ERROR',
      },
      { status: 503 }
    );
  }

  // JSON parse errors
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON format.',
        code: 'INVALID_JSON',
      },
      { status: 400 }
    );
  }

  // Supabase errors
  if (error instanceof Error && error.message.includes('Supabase')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database error. Please contact support.',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }

  // Default unknown error
  const isDev = process.env.NODE_ENV === 'development';
  return NextResponse.json(
    {
      success: false,
      error: isDev 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR',
      details: isDev ? { originalError: String(error) } : undefined,
    },
    { status: 500 }
  );
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): void {
  const missing = fields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new AppError(
      400,
      `Missing required fields: ${missing.join(', ')}`,
      'MISSING_FIELDS'
    );
  }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new AppError(400, 'Invalid URL format', 'INVALID_URL');
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(400, 'Invalid email format', 'INVALID_EMAIL');
  }
}

/**
 * Validate credits
 */
export function validateCredits(credits: any): void {
  if (typeof credits !== 'number') {
    throw new AppError(400, 'Credits must be a number', 'INVALID_CREDITS');
  }
  if (credits < 0) {
    throw new AppError(400, 'Credits cannot be negative', 'NEGATIVE_CREDITS');
  }
  if (!Number.isInteger(credits)) {
    throw new AppError(400, 'Credits must be an integer', 'INVALID_CREDITS');
  }
}

/**
 * Rate limiting helper
 * 
 * ARCHITECTURE NOTE:
 * This in-memory implementation works ONLY in development.
 * 
 * In production (Vercel serverless):
 * - Each request goes to a potentially different instance
 * - Each instance has an empty Map at startup
 * - Rate limiting state cannot be shared across instances
 * 
 * For MVP, production rate limiting relies on:
 * 1. Stripe API rate limits (100 req/sec per key)
 * 2. Supabase connection limits
 * 3. HTTP rate limits at Vercel edge
 * 
 * Future improvements:
 * - Option A: Upstash Redis (free tier: 10k req/day)
 * - Option B: Supabase-based rate limiting (store attempts in DB)
 * - Option C: Third-party service (Auth0, Cloudflare)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): void {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (record.count >= limit) {
    const resetIn = Math.ceil((record.resetTime - now) / 1000);
    throw new AppError(
      429,
      `Too many requests. Try again in ${resetIn} seconds.`,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  record.count++;
}

/**
 * Retry helper for flaky operations
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on 4xx errors (except 429)
      if (error instanceof AppError && error.statusCode < 500 && error.statusCode !== 429) {
        throw error;
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Retries exhausted');
}

/**
 * Log API action for audit
 */
export function logAction(
  action: string,
  userId?: number | string,
  metadata?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const userInfo = userId ? ` [User: ${userId}]` : '';
  const metaInfo = metadata ? ` ${JSON.stringify(metadata)}` : '';
  console.log(`[${timestamp}] ${action}${userInfo}${metaInfo}`);
}
