import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { queryUser, createUser } from '@/lib/db';
import { SignupSchema, validateInput } from '@/lib/validation';
import { AppError, handleError } from '@/lib/error-handler';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    // Validate using schema
    const { email, password } = await validateInput(SignupSchema, body);

    // Check if user exists
    let existingUser = null;
    try {
      existingUser = await queryUser(email);
    } catch (error) {
      // User not found is expected, continue
      if (!(error instanceof Error) || !error.message.includes('No rows')) {
        throw error;
      }
    }
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered', code: 'USER_EXISTS' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    await createUser(email, hashedPassword);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please sign in.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return handleError(error);
    }

    const message = error instanceof Error ? error.message : 'An error occurred during signup';
    if (message.includes('Validation failed')) {
      return NextResponse.json(
        { success: false, error: message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
