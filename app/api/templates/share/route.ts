import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
  handleError,
  AppError,
  logAction,
} from '@/lib/error-handler';

// GET /api/templates/share - List shared templates accessible to user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || typeof session.user.id !== 'string' || !session.user.id.trim()) {
      throw new AppError(401, 'Unauthorized - invalid session', 'UNAUTHORIZED');
    }

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.user.id)) {
      throw new AppError(400, 'Invalid user ID format', 'INVALID_USER_ID');
    }

    const userId = session.user.id; // UUID string from auth.users

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic') === 'true';

    // Build query
    let query = supabase.from('email_templates').select('*', { count: 'exact' });

    // Get templates shared with this user or public templates
    if (isPublic) {
      query = query.eq('is_public', true);
    } else {
      // Templates shared with user (via shared_with array) or public templates
      // Use PostgREST 'cs' (contains string) operator with array syntax {userId}
      query = query.or(`is_public.eq.true,shared_with.cs.{${userId}}`);
    }

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new AppError(500, 'Failed to fetch shared templates', 'DB_ERROR');
    }

    logAction('SHARED_TEMPLATES_LISTED', userId, { 
      count: data?.length || 0,
      category,
      isPublic,
    });

    return NextResponse.json({
      success: true,
      templates: data || [],
      pagination: {
        total: count || 0,
        limit: 50,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
