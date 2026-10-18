import { supabase } from '../lib/supabase';

export interface PollOption {
  id: string;
  text: string;
  votesCount?: number;
}

export interface UserPoll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  targetRole: 'all' | 'merchant' | 'supplier';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalVotes?: number;
  isDeleted?: boolean;
}

const POLICY_TYPE = 'USER_POLL';
const STORAGE_PREFIX = 'jiibha_poll_voted_';
let cachedPoll: { data: UserPoll | null; timestamp: number } | null = null;
const POLL_CACHE_TTL = 3 * 60 * 1000;

export const pollService = {
  /**
   * Fetch the current active poll from platform_policies and tally live votes
   */
  async getPoll(force = false): Promise<UserPoll | null> {
    if (!force && cachedPoll && (Date.now() - cachedPoll.timestamp < POLL_CACHE_TTL)) {
      return cachedPoll.data;
    }
    try {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching poll from platform_policies:', error);
        return null;
      }

      if (!data || !data.content) {
        return null;
      }

      try {
        const parsed = JSON.parse(data.content) as UserPoll;
        if (parsed.isDeleted) return null;

        // Try to fetch live votes from poll_votes table if available
        try {
          const { data: votes, error: votesError } = await supabase
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', parsed.id);

          if (!votesError && votes) {
            const counts: Record<string, number> = {};
            votes.forEach((v: { option_id: string }) => {
              counts[v.option_id] = (counts[v.option_id] || 0) + 1;
            });

            parsed.options = parsed.options.map(opt => ({
              ...opt,
              votesCount: counts[opt.id] || 0,
            }));
            parsed.totalVotes = votes.length;
          }
        } catch {
          // If poll_votes table doesn't exist yet, fallback to stored votesCount
        }

        return parsed;
      } catch (err) {
        console.error('Error parsing poll content:', err);
        return null;
      }
    } catch (err) {
      console.error('Unexpected error in getPoll:', err);
      return null;
    }
  },

  /**
   * Save or update the poll (Admin only)
   */
  async savePoll(pollData: Partial<UserPoll>): Promise<{ success: boolean; data?: UserPoll; error?: any }> {
    cachedPoll = null;
    try {
      const now = new Date().toISOString();
      const existing = await this.getPoll();

      const newPoll: UserPoll = {
        id: pollData.id || existing?.id || `poll_${Date.now()}`,
        question: pollData.question ?? existing?.question ?? '',
        description: pollData.description ?? existing?.description ?? '',
        options: (pollData.options || existing?.options || [
          { id: 'opt_1', text: 'أوافق بشدة', votesCount: 0 },
          { id: 'opt_2', text: 'محايد', votesCount: 0 },
          { id: 'opt_3', text: 'لا أوافق', votesCount: 0 },
        ]).map((opt, i) => ({
          id: opt.id || `opt_${i + 1}`,
          text: opt.text,
          votesCount: opt.votesCount || 0
        })),
        targetRole: pollData.targetRole ?? existing?.targetRole ?? 'all',
        isActive: pollData.isActive !== undefined ? pollData.isActive : (existing?.isActive ?? true),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        totalVotes: existing?.totalVotes || 0,
        isDeleted: false,
      };

      const payload = {
        policy_type: POLICY_TYPE,
        content: JSON.stringify(newPoll),
        updated_at: now
      };

      const { data: existingRecord } = await supabase
        .from('platform_policies')
        .select('id')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      let opError;
      if (existingRecord) {
        const { error } = await supabase
          .from('platform_policies')
          .update(payload)
          .eq('policy_type', POLICY_TYPE);
        opError = error;
      } else {
        const { error } = await supabase
          .from('platform_policies')
          .insert(payload);
        opError = error;
      }

      if (opError) {
        console.error('Error saving poll to platform_policies:', opError);
        return { success: false, error: opError };
      }

      return { success: true, data: newPoll };
    } catch (err) {
      console.error('Unexpected error in savePoll:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Toggle active state
   */
  async toggleActive(isActive: boolean): Promise<{ success: boolean; data?: UserPoll; error?: any }> {
    try {
      const current = await this.getPoll();
      if (!current) return { success: false, error: 'No poll found' };
      return this.savePoll({ ...current, isActive });
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Reset poll votes (creates a new poll ID or clears votes)
   */
  async resetPoll(newQuestion?: string): Promise<{ success: boolean; data?: UserPoll; error?: any }> {
    try {
      const current = await this.getPoll();
      if (!current) return { success: false, error: 'No poll found' };

      const newPollId = `poll_${Date.now()}`;
      const updatedOptions = current.options.map(opt => ({
        ...opt,
        votesCount: 0
      }));

      return this.savePoll({
        ...current,
        id: newPollId,
        question: newQuestion || current.question,
        options: updatedOptions,
        totalVotes: 0,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Check if a specific user has voted on this poll
   */
  hasUserVoted(pollId: string, userId: string): string | null {
    if (!pollId || !userId) return null;
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${pollId}_${userId}`);
    } catch {
      return null;
    }
  },

  /**
   * Submit a user's vote
   */
  async submitVote(
    pollId: string, 
    userId: string, 
    optionId: string
  ): Promise<{ success: boolean; selectedOptionId: string; error?: any }> {
    try {
      // 1. Mark in localStorage immediately
      localStorage.setItem(`${STORAGE_PREFIX}${pollId}_${userId}`, optionId);

      // 2. Try inserting into Supabase poll_votes table
      try {
        await supabase
          .from('poll_votes')
          .insert({
            poll_id: pollId,
            user_id: userId,
            option_id: optionId
          });
      } catch (dbErr) {
        console.warn('Could not insert to poll_votes table (might not exist yet):', dbErr);
      }

      return { success: true, selectedOptionId: optionId };
    } catch (err) {
      console.error('Error submitting vote:', err);
      return { success: false, selectedOptionId: optionId, error: err };
    }
  }
};
