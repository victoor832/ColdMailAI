import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
  handleError,
  AppError,
  checkRateLimit,
  logAction,
} from '@/lib/error-handler';
import { z } from 'zod';

// Schemas
const GetTemplatesSchema = z.object({
  category: z.string().optional(),
  includePublic: z.boolean().optional().default(false),
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
  category: z.enum(['general', 'sales', 'support', 'followup']).default('general'),
  subject_template: z.string().min(5).max(500),
  body_template: z.string().min(20).max(5000),
  variables: z.record(z.string()).optional().default({}),
  is_public: z.boolean().optional().default(false),
});

const UpdateTemplateSchema = CreateTemplateSchema.partial().required({
  name: true,
});

// GET /api/templates - List user's templates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const includePublic = searchParams.get('includePublic') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('email_templates')
      .select('*', { count: 'exact' });

    // Filter by user or public templates
    if (includePublic) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true`);
    } else {
      query = query.eq('user_id', userId);
    }

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Pagination and sorting
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError(500, 'Failed to fetch templates', 'DB_ERROR');
    }

    logAction('TEMPLATES_LISTED', userId, { count, category, includePublic });

    return NextResponse.json({
      success: true,
      templates: data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/templates - Create new template
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Rate limiting: 5 templates created per hour
    checkRateLimit(`create-template:${userId}`, 5, 3600000);

    // Parse and validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON', 'INVALID_JSON');
    }

    const validatedData = CreateTemplateSchema.parse(body);

    // Check if template name already exists for this user
    const { data: existing } = await supabase
      .from('email_templates')
      .select('id')
      .eq('user_id', userId)
      .eq('name', validatedData.name)
      .single();

    if (existing) {
      throw new AppError(409, 'Template with this name already exists', 'DUPLICATE_NAME');
    }

    // Create template
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        user_id: userId,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        subject_template: validatedData.subject_template,
        body_template: validatedData.body_template,
        variables: validatedData.variables,
        is_public: validatedData.is_public,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(500, 'Failed to create template', 'DB_ERROR');
    }

    logAction('TEMPLATE_CREATED', userId, {
      templateId: data.id,
      name: validatedData.name,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Template created successfully',
        template: data,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
