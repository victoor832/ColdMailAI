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
const ShareTemplateSchema = z
  .object({
    userIds: z.array(z.string().email('Each user ID must be a valid email')).optional(),
    makePublic: z.boolean().optional(),
  })
  .refine(
    (data) => (data.userIds && data.userIds.length > 0) || data.makePublic === true,
    {
      message: 'At least one of userIds or makePublic must be specified',
      path: [], // Top-level error for better client handling
    }
  );

// POST /api/templates/[id]/share - Share template
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized - invalid session', 'UNAUTHORIZED');
    }

    // Convert userId to number (NextAuth provides it as string)
    const userId = parseInt(session.user.id, 10);
    const templateId = params.id;

    if (!templateId) {
      throw new AppError(400, 'Template ID is required', 'MISSING_TEMPLATE_ID');
    }

    // Parse and validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON', 'INVALID_JSON');
    }

    // Validate request body
    let validatedData: any;
    try {
      validatedData = ShareTemplateSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errors = validationError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new AppError(400, `Invalid request: ${errors}`, 'VALIDATION_ERROR');
      }
      throw new AppError(400, 'Invalid request body', 'VALIDATION_ERROR');
    }

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
