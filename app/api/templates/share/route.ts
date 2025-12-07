import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/db';
import {
  handleError,
  AppError,
  logAction,
} from '@/lib/error-handler';
import { z } from 'zod';

// Schemas
const ShareTemplateSchema = z.object({
  userIds: z.array(z.number()).optional(),
  makePublic: z.boolean().optional(),
});

// POST /api/templates/[id]/share - Share template
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);
    const templateId = params.id;

    // Parse and validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON', 'INVALID_JSON');
    }

    const validatedData = ShareTemplateSchema.parse(body);

    // Get template
    const { data: template, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    // Check ownership
    if (template.user_id !== userId) {
      throw new AppError(403, 'You can only share your own templates', 'FORBIDDEN');
    }

    // Update sharing settings
    const updatedData: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.makePublic !== undefined) {
      updatedData.is_public = validatedData.makePublic;
    }

    if (validatedData.userIds) {
      updatedData.shared_with = validatedData.userIds;
      updatedData.is_shared = validatedData.userIds.length > 0;
    }

    // Update template
    const { data, error } = await supabase
      .from('email_templates')
      .update(updatedData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new AppError(500, 'Failed to share template', 'DB_ERROR');
    }

    logAction('TEMPLATE_SHARED', userId, {
      templateId,
      userCount: validatedData.userIds?.length || 0,
      isPublic: validatedData.makePublic,
    });

    return NextResponse.json({
      success: true,
      message: 'Template sharing settings updated',
      template: data,
    });
  } catch (error) {
    return handleError(error);
  }
}

// GET /api/templates/shared - List shared templates accessible to user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Get templates shared with this user or public templates
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .or(
        `is_public.eq.true,shared_with.contains.[${userId}]`
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new AppError(500, 'Failed to fetch shared templates', 'DB_ERROR');
    }

    logAction('SHARED_TEMPLATES_LISTED', userId, { count: data?.length || 0 });

    return NextResponse.json({
      success: true,
      templates: data || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
