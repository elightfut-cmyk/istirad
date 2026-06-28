import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  fetchNotifications: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, type, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) {
          console.error('Notifications fetch error:', error);
          return;
      }
      
      const unreadCount = data.filter(n => !n.is_read).length;
      set({ notifications: data as Notification[], unreadCount });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  },

  markAsRead: async () => {
    try {
      const { notifications, unreadCount } = get();
      if (unreadCount === 0) return;
      
      // Optimistic update
      set({ 
        notifications: notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0 
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const { notifications, unreadCount } = get();
      const notifToDelete = notifications.find(n => n.id === id);
      
      // Optimistic update
      set({
        notifications: notifications.filter(n => n.id !== id),
        unreadCount: notifToDelete && !notifToDelete.is_read ? unreadCount - 1 : unreadCount
      });

      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }
}));

export const sendNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  try {
    if (userId === 'all_suppliers' || userId === 'all_admins') {
       const roleToFind = userId === 'all_suppliers' ? 'supplier' : 'admin';
       const { data: targetUsers } = await supabase.from('users').select('id').eq('role', roleToFind);
       if (targetUsers && targetUsers.length > 0) {
         const inserts = targetUsers.map(u => ({
           user_id: u.id,
           title,
           message,
           type
         }));
         await supabase.from('notifications').insert(inserts);
       }
       return;
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
