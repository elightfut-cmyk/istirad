import { supabase } from '../lib/supabase';

export interface TenderAppPromptConfig {
  id: string;
  isActive: boolean;
  title: string;
  message: string;
  buttonText: string;
  apkUrl: string;
  versionToken: string; // Used so admin can reset seen status for everyone
  updatedAt: string;
}

const POLICY_TYPE = 'TENDER_APP_PROMPT';
const STORAGE_KEY = 'jiibha_tender_prompt_seen_token';

export const defaultTenderPromptConfig: TenderAppPromptConfig = {
  id: 'tender_prompt_default',
  isActive: true,
  title: 'حمّل التطبيق لتصلك تنبيهات المناقصات فوراً!',
  message: 'عند قيامك بطرح مناقصة جديدة أو تقديم عروض أسعار، من الضروري تثبيت تطبيق جيبها على هاتفك لتلقي تنبيهات وإشعارات فورية على شاشة هاتفك بمجرد ورود أي عرض أو رد جديد.',
  buttonText: 'تحميل وتثبيت التطبيق الآن',
  apkUrl: '/jibha-app.apk',
  versionToken: 'v1',
  updatedAt: new Date().toISOString(),
};

export const tenderAppPromptService = {
  async getConfig(): Promise<TenderAppPromptConfig> {
    try {
      const { data, error } = await supabase
        .from('platform_policies')
        .select('*')
        .eq('policy_type', POLICY_TYPE)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tender app prompt config:', error);
        return defaultTenderPromptConfig;
      }

      if (!data || !data.content) {
        return defaultTenderPromptConfig;
      }

      try {
        const parsed = JSON.parse(data.content) as Partial<TenderAppPromptConfig>;
        return {
          ...defaultTenderPromptConfig,
          ...parsed,
        };
      } catch (err) {
        console.error('Error parsing tender prompt config JSON:', err);
        return defaultTenderPromptConfig;
      }
    } catch (err) {
      console.error('Unexpected error in tenderAppPromptService.getConfig:', err);
      return defaultTenderPromptConfig;
    }
  },

  async saveConfig(configData: Partial<TenderAppPromptConfig>): Promise<{ success: boolean; data?: TenderAppPromptConfig; error?: any }> {
    try {
      const current = await this.getConfig();
      const updated: TenderAppPromptConfig = {
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
        console.error('Error saving tender app prompt config:', error);
        return { success: false, error };
      }

      return { success: true, data: updated };
    } catch (err) {
      console.error('Unexpected error saving tender prompt config:', err);
      return { success: false, error: err };
    }
  },

  hasUserSeenPrompt(versionToken: string): boolean {
    try {
      const seenToken = localStorage.getItem(STORAGE_KEY);
      return seenToken === versionToken;
    } catch {
      return false;
    }
  },

  markPromptAsSeen(versionToken: string) {
    try {
      localStorage.setItem(STORAGE_KEY, versionToken);
    } catch (e) {
      console.error('Could not save seen status', e);
    }
  },

  resetSeenStatus() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Could not reset seen status', e);
    }
  }
};
