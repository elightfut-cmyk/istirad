import { supabase } from '../lib/supabase';

export interface SocialLinksAlert {
  id: string;
  title: string;
  message: string;
  facebookUrl: string;
  telegramUrl: string;
  isActive: boolean;
  targetRole: 'merchant' | 'supplier' | 'all';
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

const POLICY_TYPE = 'SOCIAL_LINKS_POPUP';
const STORAGE_PREFIX = 'jiibha_social_alert_seen_';

export const socialLinksAlertService = {
  async getAlert(): Promise<SocialLinksAlert | null> {
    try {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching social links alert:', error);
        return null;
      }

      if (!data || !data.content) {
        return null;
      }

      try {
        const parsed = JSON.parse(data.content) as SocialLinksAlert;
        if (parsed.isDeleted) return null;
        return parsed;
      } catch (err) {
        console.error('Error parsing social links alert content:', err);
        return null;
      }
    } catch (err) {
      console.error('Unexpected error in getAlert:', err);
      return null;
    }
  },

  async saveAlert(alertData: Partial<SocialLinksAlert>): Promise<{ success: boolean; data?: SocialLinksAlert; error?: any }> {
    try {
      const now = new Date().toISOString();
      const existing = await this.getAlert();

      const newAlert: SocialLinksAlert = {
        id: alertData.id || existing?.id || `social_alert_${Date.now()}`,
        title: alertData.title ?? existing?.title ?? 'تابعنا على منصات التواصل',
        message: alertData.message ?? existing?.message ?? 'اشترك في قنواتنا ليصلك كل جديد',
        facebookUrl: alertData.facebookUrl ?? existing?.facebookUrl ?? '',
        telegramUrl: alertData.telegramUrl ?? existing?.telegramUrl ?? '',
        targetRole: alertData.targetRole ?? existing?.targetRole ?? 'merchant',
        isActive: alertData.isActive ?? existing?.isActive ?? true,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        isDeleted: false,
      };

      const { error } = await supabase
        .from('platform_policies')
        .upsert(
          {
            policy_type: POLICY_TYPE,
            content: JSON.stringify(newAlert),
            updated_at: now,
          },
          { onConflict: 'policy_type' }
        );

      if (error) {
        console.error('Error saving social links alert:', error);
        return { success: false, error };
      }

      return { success: true, data: newAlert };
    } catch (err) {
      console.error('Unexpected error in saveAlert:', err);
      return { success: false, error: err };
    }
  },

  async toggleActive(isActive: boolean): Promise<{ success: boolean; data?: SocialLinksAlert; error?: any }> {
    try {
      const alert = await this.getAlert();
      if (!alert) return { success: false, error: 'No alert found' };
      return await this.saveAlert({ ...alert, isActive });
    } catch (err) {
      return { success: false, error: err };
    }
  },

  async deleteAlert(): Promise<{ success: boolean; error?: any }> {
    try {
      const { error: delError } = await supabase
        .from('platform_policies')
        .delete()
        .eq('policy_type', POLICY_TYPE);

      if (!delError) return { success: true };

      const now = new Date().toISOString();
      const { error: upsertError } = await supabase
        .from('platform_policies')
        .upsert(
          {
            policy_type: POLICY_TYPE,
            content: JSON.stringify({ isDeleted: true, isActive: false, title: '', message: '', facebookUrl: '', telegramUrl: '' }),
            updated_at: now,
          },
          { onConflict: 'policy_type' }
        );

      if (upsertError) return { success: false, error: upsertError };
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  hasUserSeenAlert(alertId: string, userId?: string): boolean {
    if (!alertId) return true;
    try {
      const key = `${STORAGE_PREFIX}${alertId}_${userId || 'anon'}`;
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  },

  markAlertAsSeen(alertId: string, userId?: string): void {
    if (!alertId) return;
    try {
      const key = `${STORAGE_PREFIX}${alertId}_${userId || 'anon'}`;
      localStorage.setItem(key, 'true');
    } catch (err) {
      console.error('Failed to save seen alert state:', err);
    }
  },

  async resetAlertForEveryone(): Promise<{ success: boolean; data?: SocialLinksAlert; error?: any }> {
    const alert = await this.getAlert();
    if (!alert) return { success: false, error: 'No alert exists' };
    return await this.saveAlert({
      ...alert,
      id: `social_alert_${Date.now()}`,
    });
  }
};
