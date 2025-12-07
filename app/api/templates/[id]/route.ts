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
const UpdateTemplateSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(['general', 'sales', 'support', 'followup']).optional(),
  subject_template: z.string().min(5).max(500).optional(),
  body_template: z.string().min(20).max(5000).optional(),
  variables: z.record(z.string()).optional(),
  is_public: z.boolean().optional(),
  performance_score: z.number().optional(),
});

// Helper: Check template ownership
async function checkTemplateOwnership(
  userId: number,
  templateId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('email_templates')
    .select('user_id')
    .eq('id', templateId)
    .single();

  return data?.user_id === userId;
}

// GET /api/templates/[id] - Get specific template
export async function GET(
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

    // Fetch template
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !data) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    // Check if user has access (owner or public)
    if (data.user_id !== userId && !data.is_public) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    logAction('TEMPLATE_VIEWED', userId, { templateId });

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/templates/[id] - Update template
export async function PATCH(
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

    // Check ownership
    const isOwner = await checkTemplateOwnership(userId, templateId);
    if (!isOwner) {
      throw new AppError(403, 'You can only edit your own templates', 'FORBIDDEN');
    }

    // Parse and validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON', 'INVALID_JSON');
    }

    const validatedData = UpdateTemplateSchema.parse(body);

    // Update template
    const { data, error } = await supabase
      .from('email_templates')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new AppError(500, 'Failed to update template', 'DB_ERROR');
    }

    logAction('TEMPLATE_UPDATED', userId, {
      templateId,
      fields: Object.keys(validatedData),
    });

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template: data,
    });
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(
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

    // Check ownership
    const isOwner = await checkTemplateOwnership(userId, templateId);
    if (!isOwner) {
      throw new AppError(403, 'You can only delete your own templates', 'FORBIDDEN');
    }

    // Delete template
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      throw new AppError(500, 'Failed to delete template', 'DB_ERROR');
    }

    logAction('TEMPLATE_DELETED', userId, { templateId });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
