import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserResearchHistory, getUserResponseHistory, deleteUserResearch, deleteUserResponse } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const [researchHistory, responseHistory] = await Promise.all([
            getUserResearchHistory(userId),
            getUserResponseHistory(userId),
        ]);

        return NextResponse.json({
            research: researchHistory,
            responses: responseHistory,
        });
    } catch (error) {
        console.error('Get history error:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching history' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'research' or 'response'
        const id = searchParams.get('id');

        if (!type || !id) {
            return NextResponse.json(
                { error: 'Type and ID are required' },
                { status: 400 }
            );
        }

        const recordId = parseInt(id);

        if (type === 'research') {
            // Verify ownership before deletion
            const { data: research, error: verifyError } = await supabase
                .from('user_researches')
                .select('user_id')
                .eq('id', recordId)
                .single();

            if (verifyError || !research || research.user_id !== userId) {
                return NextResponse.json(
                    { error: 'Not authorized to delete this resource' },
                    { status: 403 }
                );
            }

            await deleteUserResearch(userId, recordId);
        } else if (type === 'response') {
            // Verify ownership before deletion
            const { data: response, error: verifyError } = await supabase
                .from('user_responses')
                .select('user_id')
                .eq('id', recordId)
                .single();

            if (verifyError || !response || response.user_id !== userId) {
                return NextResponse.json(
                    { error: 'Not authorized to delete this resource' },
                    { status: 403 }
                );
            }

            await deleteUserResponse(userId, recordId);
        } else {
            return NextResponse.json(
                { error: 'Invalid type' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete history error:', error);
        return NextResponse.json(
            { error: 'An error occurred while deleting record' },
            { status: 500 }
        );
    }
}
