import { supabase } from '../lib/supabase';

export interface DashboardAlert {
  id: string;
  title: string;
  message: string;
  targetRole: 'all' | 'merchant' | 'supplier';
  alertType: 'info' | 'warning' | 'urgent' | 'success';
  buttonText?: string;
  buttonUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

const POLICY_TYPE = 'DASHBOARD_POPUP';
const STORAGE_PREFIX = 'jiibha_alert_seen_';

export const dashboardAlertService = {
  /**
   * Fetch the current dashboard popup alert from platform_policies
   */
  async getAlert(): Promise<DashboardAlert | null> {
    try {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching dashboard alert:', error);
        return null;
      }

      if (!data || !data.content) {
        return null;
      }

      try {
        const parsed = JSON.parse(data.content) as DashboardAlert;
        if (parsed.isDeleted) return null;
        return parsed;
      } catch (err) {
        console.error('Error parsing dashboard alert content:', err);
        return null;
      }
    } catch (err) {
      console.error('Unexpected error in getAlert:', err);
      return null;
    }
  },

  /**
   * Save or update the dashboard alert
   */
  async saveAlert(alertData: Partial<DashboardAlert>): Promise<{ success: boolean; data?: DashboardAlert; error?: any }> {
    try {
      const now = new Date().toISOString();
      const existing = await this.getAlert();

      const newAlert: DashboardAlert = {
        id: alertData.id || existing?.id || `alert_${Date.now()}`,
        title: alertData.title ?? existing?.title ?? '',
        message: alertData.message ?? existing?.message ?? '',
        targetRole: alertData.targetRole ?? existing?.targetRole ?? 'all',
        alertType: alertData.alertType ?? existing?.alertType ?? 'info',
        buttonText: alertData.buttonText ?? existing?.buttonText ?? '',
        buttonUrl: alertData.buttonUrl ?? existing?.buttonUrl ?? '',
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
        console.error('Error saving dashboard alert to platform_policies:', error);
        return { success: false, error };
      }

      return { success: true, data: newAlert };
    } catch (err) {
      console.error('Unexpected error in saveAlert:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Toggle the alert status (enable / disable)
   */
  async toggleActive(isActive: boolean): Promise<{ success: boolean; data?: DashboardAlert; error?: any }> {
    try {
      const alert = await this.getAlert();
      if (!alert) {
        return { success: false, error: 'No alert found to toggle' };
      }
      return await this.saveAlert({ ...alert, isActive });
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Delete the dashboard alert
   */
  async deleteAlert(): Promise<{ success: boolean; error?: any }> {
    try {
      // First attempt database delete
      const { error: delError } = await supabase
        .from('platform_policies')
        .delete()
        .eq('policy_type', POLICY_TYPE);

      // If delete succeeded without error
      if (!delError) {
        return { success: true };
      }

      // If delete was blocked by RLS, perform soft delete via upsert
      const now = new Date().toISOString();
      const { error: upsertError } = await supabase
        .from('platform_policies')
        .upsert(
          {
            policy_type: POLICY_TYPE,
            content: JSON.stringify({ isDeleted: true, isActive: false, title: '', message: '' }),
            updated_at: now,
          },
          { onConflict: 'policy_type' }
        );

      if (upsertError) {
        return { success: false, error: upsertError };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Check if user has already seen this alert version
   */
  hasUserSeenAlert(alertId: string, userId?: string): boolean {
    if (!alertId) return true;
    try {
      const key = `${STORAGE_PREFIX}${alertId}_${userId || 'anon'}`;
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Mark alert as seen for the user
   */
  markAlertAsSeen(alertId: string, userId?: string): void {
    if (!alertId) return;
    try {
      const key = `${STORAGE_PREFIX}${alertId}_${userId || 'anon'}`;
      localStorage.setItem(key, 'true');
    } catch (err) {
      console.error('Failed to save seen alert state:', err);
    }
  },

  /**
   * Reset the alert ID to force showing it again to all users
   */
  async resetAlertForEveryone(): Promise<{ success: boolean; data?: DashboardAlert; error?: any }> {
    const alert = await this.getAlert();
    if (!alert) return { success: false, error: 'No alert exists' };
    return await this.saveAlert({
      ...alert,
      id: `alert_${Date.now()}`,
    });
  }
};
