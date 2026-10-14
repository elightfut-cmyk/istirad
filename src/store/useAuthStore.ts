import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { loginOneSignalUser, logoutOneSignalUser } from '../lib/onesignal';

export type Role = 'admin' | 'merchant' | 'supplier' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  company_name?: string;
  address?: string;
  telegram_chat_id?: string;
  referred_by?: string;
  created_at: string;
  has_made_first_order?: boolean;
  loyalty_points?: number;
  has_successful_referral?: boolean;
  wallet_balance?: number;
  status?: string;
  has_accepted_tos?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false });
    if (user?.id) {
      loginOneSignalUser(user.id);
    }
  },
  checkSession: async () => {
    try {
      const getSessionWithTimeout = async () => {
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 1500)
        );
        return Promise.race([supabase.auth.getSession(), timeoutPromise]);
      };

      const { data: { session } } = await getSessionWithTimeout();
      if (!session) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Fetch user profile from the custom users table with timeout
      const getProfileWithTimeout = async () => {
        const timeoutPromise = new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 1500)
        );
        const profilePromise = supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        return Promise.race([profilePromise, timeoutPromise]);
      };

      const { data: profile } = await getProfileWithTimeout();

      if (profile) {
        set({ user: profile as User, isAuthenticated: true, isLoading: false });
        loginOneSignalUser(profile.id);
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Session check failed', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  logout: async () => {
    await supabase.auth.signOut();
    logoutOneSignalUser();
    set({ user: null, isAuthenticated: false });
  },
}));
