import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { queryUser, createUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user exists - queryUser returns null if not found or errors
    const existingUser = await queryUser(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await createUser(email, hashedPassword);
    
    return NextResponse.json({ 
      success: true,
      message: 'Account created successfully. Please sign in.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during signup';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
