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
let cachedUpdateConfig: { data: AppUpdateConfig; timestamp: number } | null = null;
const UPDATE_CACHE_TTL = 10 * 60 * 1000;

export const defaultUpdateConfig: AppUpdateConfig = {
  id: 'app_update_default',
  isActive: false,
  version: '1.3.6',
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
  async getConfig(force = false): Promise<AppUpdateConfig> {
    if (!force && cachedUpdateConfig && (Date.now() - cachedUpdateConfig.timestamp < UPDATE_CACHE_TTL)) {
      return cachedUpdateConfig.data;
    }
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
        const res = {
          ...defaultUpdateConfig,
          ...parsed,
        };
        cachedUpdateConfig = { data: res, timestamp: Date.now() };
        return res;
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

      // Sync with app_settings table
      try {
        const versionCode = parseInt(updated.version.replace(/[^\d]/g, ''), 10) || 1;
        await supabase.from('app_settings').upsert({
          id: 1,
          latest_version_code: versionCode,
          latest_version_name: updated.version,
          apk_download_url: updated.apkUrl,
          updated_at: updated.updatedAt,
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn('Could not sync to app_settings:', e);
      }

      return { success: true, data: updated };
    } catch (err) {
      console.error('Unexpected error saving update config:', err);
      return { success: false, error: err };
    }
  },
};
