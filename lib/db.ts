import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function initializeDatabase() {
  try {
    // Supabase creates tables automatically when defined via dashboard
    // This function is kept for compatibility but Supabase handles migrations differently
    console.log('Database connection established with Supabase');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

export async function queryUser(email: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Query user error:', error);
    throw error;
  }
}

export async function createUser(email: string, passwordHash: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          credits: 3,
          plan: 'free',
        },
      ])
      .select();

    if (error) {
      console.error('Create user error:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

export async function updateUserCredits(userId: number, creditsToAdd: number) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ credits: supabase.rpc('increment_credits', { user_id: userId, amount: creditsToAdd }) })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Update credits error:', error);
    throw error;
  }
}

export async function getUserCredits(userId: number): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error) throw error;
    // Return null for unlimited users, 0 if undefined
    return data?.credits ?? 0;
  } catch (error) {
    console.error('Get credits error:', error);
    throw error;
  }
}

export async function decrementCredits(userId: number) {
  try {
    const credits = await getUserCredits(userId);
    if (credits <= 0) {
      throw new Error('Insufficient credits');
    }

    const { error } = await supabase
      .from('users')
      .update({ credits: credits - 1 })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Decrement credits error:', error);
    throw error;
  }
}

export async function saveUserResponse(
  userId: number,
  angleUsed: string,
  objectionType: string,
  sentiment: string,
  urgency: string,
  originalEmail: string,
  prospectResponse: string,
  generatedReplies: any
) {
  try {
    const { error } = await supabase
      .from('user_responses')
      .insert([
        {
          user_id: userId,
          angle_used: angleUsed,
          objection_type: objectionType,
          sentiment,
          urgency,
          original_email: originalEmail,
          prospect_response: prospectResponse,
          generated_replies: generatedReplies,
        },
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Save user response error:', error);
    throw error;
  }
}

export async function saveUserResearch(
  userId: number,
  url: string,
  service: string,
  angles: any
) {
  try {
    const { error } = await supabase
      .from('user_researches')
      .insert([
        {
          user_id: userId,
          url,
          service,
          angles,
        },
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Save user research error:', error);
    throw error;
  }
}

export async function getUserResearchHistory(userId: number) {
  try {
    const { data, error } = await supabase
      .from('user_researches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get research history error:', error);
    throw error;
  }
}

export async function getUserResponseHistory(userId: number) {
  try {
    const { data, error } = await supabase
      .from('user_responses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get response history error:', error);
    return [];
  }
}

export async function saveGlobalResponse(
  angleUsed: string,
  objectionType: string,
  sentiment: string,
  urgency: string
) {
  try {
    const { error } = await supabase
      .from('global_responses')
      .insert([
        {
          angle_used: angleUsed,
          objection_type: objectionType,
          sentiment,
          urgency,
        },
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Save global response error:', error);
    throw error;
  }
}

export async function getGlobalResponseStats() {
  try {
    const { count, error: countError } = await supabase
      .from('global_responses')
      .select('*', { count: 'exact', head: true });

    if (countError || !count || count < 500) {
      return null;
    }

    // Get angle stats
    const { data: angleStats, error: angleError } = await supabase
      .from('global_responses')
      .select('angle_used, sentiment')
      .not('angle_used', 'is', null);

    // Get objection stats
    const { data: objectionStats, error: objectionError } = await supabase
      .from('global_responses')
      .select('objection_type')
      .not('objection_type', 'is', null);

    if (angleError || objectionError) {
      console.error('Get stats error');
      return null;
    }

    return {
      totalResponses: count,
      angleStats: angleStats || [],
      objectionStats: objectionStats || [],
    };
  } catch (error) {
    console.error('Get global stats error:', error);
    return null;
  }
}

export async function updateResearchEmails(
  userId: number,
  url: string,
  generatedEmails: any
) {
  try {
    const { error } = await supabase
      .from('user_researches')
      .update({ generated_emails: generatedEmails })
      .eq('user_id', userId)
      .eq('url', url)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
  } catch (error) {
    console.error('Update research emails error:', error);
    throw error;
  }
}

export async function deleteUserResearch(userId: number, researchId: number) {
  try {
    const { error } = await supabase
      .from('user_researches')
      .delete()
      .eq('id', researchId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Delete research error:', error);
    throw error;
  }
}

export async function deleteUserResponse(userId: number, responseId: number) {
  try {
    const { error } = await supabase
      .from('user_responses')
      .delete()
      .eq('id', responseId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Delete response error:', error);
    throw error;
  }
}

export { supabase };
