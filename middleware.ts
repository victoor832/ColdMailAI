import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Rate limit store: Map<identifier, { requests: number[], resetTime: number }>
// Note: In development only. For production rate limiting, use API-level checks in error-handler.ts
const rateLimitStore = new Map<string, { requests: number[]; resetTime: number }>();

// Cleanup old entries every 5 minutes
if (typeof global !== 'undefined') {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (process.env.NODE_ENV === 'development') {
    (global as any).rateLimitCleanup = cleanup;
  }
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: NextRequest) => string;
}

const API_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/analyze': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    keyGenerator: (req) => `analyze:${getClientId(req)}`,
  },
  '/api/respond': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
    keyGenerator: (req) => `respond:${getClientId(req)}`,
  },
  '/api/generate-emails': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 30,
    keyGenerator: (req) => `generate-emails:${getClientId(req)}`,
  },
  '/api/checkout': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) => `checkout:${getClientId(req)}`,
  },
};

function getClientId(req: NextRequest): string {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  return ip;
}

function isRateLimited(key: string, config: RateLimitConfig): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      requests: [now],
      resetTime: now + config.windowMs,
    });
    return { limited: false, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  record.requests = record.requests.filter((time) => now - time < config.windowMs);

  if (record.requests.length >= config.maxRequests) {
    return { limited: true, remaining: 0, resetAt: record.resetTime };
  }

  record.requests.push(now);
  return { limited: false, remaining: config.maxRequests - record.requests.length, resetAt: record.resetTime };
}

function checkRateLimitForPath(pathname: string, req: NextRequest): NextResponse | null {
  for (const [path, config] of Object.entries(API_RATE_LIMITS)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      const key = config.keyGenerator(req);
      const { limited, remaining, resetAt } = isRateLimited(key, config);

      if (limited) {
        const resetDate = new Date(resetAt);
        return NextResponse.json(
          {
            success: false,
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetDate.toISOString(),
            },
          }
        );
      }

      req.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      req.headers.set('X-RateLimit-Remaining', remaining.toString());
      req.headers.set('X-RateLimit-Reset', new Date(resetAt).toISOString());

      return null;
    }
  }

  return null;
}

export const middleware = withAuth(
  (req) => {
    const pathname = req.nextUrl.pathname;

    // Development: Check rate limits
    if (process.env.NODE_ENV === 'development') {
      const rateLimitResponse = checkRateLimitForPath(pathname, req);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        const publicRoutes = ['/api/auth/signin', '/api/auth/signup'];
        if (publicRoutes.some((route) => pathname === route)) {
          return true;
        }

        return !!token;
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

export const config = {
  matcher: [
    '/research',
    '/respond',
    '/dashboard',
    '/pricing',
    '/api/analyze',
    '/api/respond',
    '/api/generate-emails',
    '/api/user/:path*',
    '/api/checkout',
  ],
};

// Security headers middleware
export function securityHeadersMiddleware(req: NextRequest) {
  const response = NextResponse.next();
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}
