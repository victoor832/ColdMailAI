import { z } from 'zod';

/**
 * Validation schemas for all API endpoints
 * Using Zod for runtime validation with TypeScript inference
 */

// ===== Auth Schemas =====

export const SignupSchema = z.object({
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email must be a string' })
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
  password: z
    .string({ required_error: 'Password is required', invalid_type_error: 'Password must be a string' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)'),
  name: z
    .string({ invalid_type_error: 'Name must be a string' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .optional(),
});

export type SignupInput = z.infer<typeof SignupSchema>;

export const SigninSchema = z.object({
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email must be a string' })
    .email('Invalid email format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required', invalid_type_error: 'Password must be a string' })
    .min(1, 'Password is required'),
});

export type SigninInput = z.infer<typeof SigninSchema>;

// ===== Research/Analyze Schemas =====

export const AnalyzeSchema = z.object({
  url: z
    .string({ required_error: 'URL is required', invalid_type_error: 'URL must be a string' })
    .url('Invalid URL format')
    .max(2048, 'URL too long')
    .refine(
      (url) => {
        try {
          const urlObj = new URL(url);
          // Reject localhost/private IPs in production
          if (process.env.NODE_ENV === 'production') {
            const hostname = urlObj.hostname;
            if (
              hostname === 'localhost' ||
              hostname === '127.0.0.1' ||
              hostname.startsWith('192.168.') ||
              hostname.startsWith('10.') ||
              hostname.startsWith('172.')
            ) {
              return false;
            }
          }
          return true;
        } catch {
          return false;
        }
      },
      'Invalid or private URL'
    ),
  service: z
    .string({ required_error: 'Service description is required', invalid_type_error: 'Service must be a string' })
    .min(3, 'Service description must be at least 3 characters')
    .max(500, 'Service description too long (max 500 characters)')
    .trim(),
});

export type AnalyzeInput = z.infer<typeof AnalyzeSchema>;

// ===== Response/Respond Schemas =====

export const RespondSchema = z.object({
  prospectResponse: z
    .string({ required_error: 'Prospect response is required', invalid_type_error: 'Response must be a string' })
    .min(10, 'Response must be at least 10 characters')
    .max(5000, 'Response too long (max 5000 characters)')
    .trim(),
  originalEmail: z
    .string({ invalid_type_error: 'Email must be a string' })
    .max(5000, 'Email too long')
    .optional()
    .default(''),
  angleUsed: z
    .string({ invalid_type_error: 'Angle must be a string' })
    .max(200, 'Angle too long')
    .optional()
    .default('unknown'),
});

export type RespondInput = z.infer<typeof RespondSchema>;

// ===== Email Generation Schema =====

export const GenerateEmailsSchema = z.object({
  url: z
    .string({ required_error: 'URL is required', invalid_type_error: 'URL must be a string' })
    .url('Invalid URL format')
    .max(2048, 'URL too long'),
  angle: z.object({
    type: z.string().optional(),
    hook: z
      .string({ required_error: 'Hook is required', invalid_type_error: 'Hook must be a string' })
      .min(5, 'Hook must be at least 5 characters')
      .max(200, 'Hook too long'),
    evidence: z
      .string({ required_error: 'Evidence is required', invalid_type_error: 'Evidence must be a string' })
      .min(5, 'Evidence must be at least 5 characters')
      .max(1000, 'Evidence too long'),
    reasoning: z.string().optional(),
    connection: z.string().optional(),
    specificityScore: z.number().optional(),
  }),
});

export type GenerateEmailsInput = z.infer<typeof GenerateEmailsSchema>;

// ===== Checkout Schema =====

export const CheckoutSchema = z.object({
  plan: z
    .enum(['starter', 'pro', 'unlimited'])
    .refine((plan) => ['starter', 'pro', 'unlimited'].includes(plan), 'Invalid plan'),
});

export type CheckoutInput = z.infer<typeof CheckoutSchema>;

// ===== Admin Schemas =====

export const SetCreditsSchema = z.object({
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email must be a string' })
    .email('Invalid email format')
    .toLowerCase(),
  credits: z
    .number({ required_error: 'Credits must be a number', invalid_type_error: 'Credits must be a number' })
    .int('Credits must be an integer')
    .min(0, 'Credits cannot be negative')
    .max(999999, 'Credits too high'),
});

export type SetCreditsInput = z.infer<typeof SetCreditsSchema>;

// ===== Utility Functions =====

/**
 * Validate input and return parsed data or throw error
 */
export async function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      throw new Error(`Validation failed: ${messages}`);
    }
    throw error;
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 5000); // Max length
}

/**
 * Validate JSON structure
 */
export function validateJSON(data: unknown): boolean {
  try {
    if (typeof data === 'string') {
      JSON.parse(data);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for SQL injection patterns
 */
export function hasSQLInjectionPattern(input: string): boolean {
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bDROP\b)/i,
    /(\bDELETE\b)/i,
    /(\bINSERT\b)/i,
    /(\bUPDATE\b)/i,
    /(--|;|\/\*|\*\/)/,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
export function hasXSSPattern(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>/i,
    /on\w+\s*=/i,
    /javascript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for common attack patterns
 */
export function checkMaliciousPatterns(input: string): string | null {
  if (hasSQLInjectionPattern(input)) {
    return 'Potentially malicious SQL pattern detected';
  }
  if (hasXSSPattern(input)) {
    return 'Potentially malicious script pattern detected';
  }
  return null;
}
