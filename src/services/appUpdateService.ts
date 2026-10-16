import { supabase } from '../lib/supabase';

export interface AppUpdateConfig {
  id: string;
  isActive: boolean;
  version: string;
  title: string;
  message: string;
  apkUrl: string;
  isForced: boolean;
  showOnWebForTesting: boolean;
  updatedAt: string;
}

const POLICY_TYPE = 'APP_FORCE_UPDATE';

export const defaultUpdateConfig: AppUpdateConfig = {
  id: 'app_update_default',
  isActive: false,
  version: '1.2.0',
  title: 'تحديث جديد متوفر لتطبيق جيبها',
  message: 'تم إطلاق تحديث جديد ومهم لتطبيق جيبها يتضمن تحسينات أساسية على سرعة التصفح، واستقبال التنبيهات الفورية وإصلاحات استقرار. يُرجى تحميل وتثبيت التحديث لمواصلة الاستخدام بأفضل أداء.',
  apkUrl: '/jiibha-app.apk',
  isForced: true,
  showOnWebForTesting: false,
  updatedAt: new Date().toISOString(),
};

export const appUpdateService = {
  /**
   * Fetch current update configuration
   */
  async getConfig(): Promise<AppUpdateConfig> {
    try {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching app update config:', error);
        return defaultUpdateConfig;
      }

      if (!data || !data.content) {
        return defaultUpdateConfig;
      }

      try {
        const parsed = JSON.parse(data.content) as Partial<AppUpdateConfig>;
        return {
          ...defaultUpdateConfig,
          ...parsed,
        };
      } catch (err) {
        console.error('Error parsing update config JSON:', err);
        return defaultUpdateConfig;
      }
    } catch (err) {
      console.error('Unexpected error in getUpdateConfig:', err);
      return defaultUpdateConfig;
    }
  },

  /**
   * Save or update config
   */
  async saveConfig(configData: Partial<AppUpdateConfig>): Promise<{ success: boolean; data?: AppUpdateConfig; error?: any }> {
    try {
      const current = await this.getConfig();
      const updated: AppUpdateConfig = {
        ...current,
        ...configData,
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('platform_policies')
        .upsert(
          {
            policy_type: POLICY_TYPE,
            content: JSON.stringify(updated),
            updated_at: updated.updatedAt,
          },
          { onConflict: 'policy_type' }
        );

      if (error) {
        console.error('Error saving app update config:', error);
        return { success: false, error };
      }

      return { success: true, data: updated };
    } catch (err) {
      console.error('Unexpected error saving update config:', err);
      return { success: false, error: err };
    }
  },
};
