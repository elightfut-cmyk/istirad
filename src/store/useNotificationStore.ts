import React from 'react';
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../services/pushNotificationService';

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
  fetchNotifications: (userId: string, force?: boolean) => Promise<void>;
  subscribeToNotifications: (userId: string) => () => void;
  pauseRealtime: () => void;
  resumeRealtime: () => void;
  markAsRead: () => Promise<void>;
  markSingleAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

let activeChannel: any = null;
let activeUserId: string | null = null;

export const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    // Harmonious double chime (D5 -> A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  } catch (e) {
    // Audio context may require initial user gesture
  }
};

let lastFetchTime = 0;
let lastFetchUserId: string | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  fetchNotifications: async (userId: string, force = false) => {
    if (!userId) return;
    const now = Date.now();
    // Throttle calls to once per 10 seconds unless forced
    if (!force && lastFetchUserId === userId && now - lastFetchTime < 10000) {
      return;
    }
    lastFetchTime = now;
    lastFetchUserId = userId;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, type, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
        
      if (error) {
          console.error('Notifications fetch error:', error);
          return;
      }
      
      // Clean UI display deduplication: merge identical twin notifications created within 60s
      const deduplicated: Notification[] = [];
      for (const n of (data as Notification[])) {
        const isTwin = deduplicated.some(existing => 
          existing.title === n.title &&
          existing.message === n.message &&
          Math.abs(new Date(existing.created_at).getTime() - new Date(n.created_at).getTime()) < 60000
        );
        if (!isTwin) {
          deduplicated.push(n);
        }
      }

      const unreadCount = deduplicated.filter(n => !n.is_read).length;
      set({ notifications: deduplicated, unreadCount });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  },

  subscribeToNotifications: (userId: string) => {
    if (!userId) return () => {};

    // If already subscribed to this same user with active channel, reuse
    if (activeChannel && activeUserId === userId) {
      return () => {};
    }

    // Remove old subscription if switching users
    if (activeChannel) {
      try {
        supabase.removeChannel(activeChannel);
      } catch {}
      activeChannel = null;
    }

    activeUserId = userId;

    try {
      const channel = supabase
        .channel(`user-notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            if (!newNotif) return;

            let isDuplicate = false;
            set((state) => {
              // 1. Check if exact ID already exists in state
              if (state.notifications.some(n => n.id === newNotif.id)) {
                isDuplicate = true;
                return state;
              }

              // 2. Check if an identical notification (same title & message within 60s) already exists
              const alreadyExists = state.notifications.some(n => 
                n.title === newNotif.title &&
                n.message === newNotif.message &&
                Math.abs(new Date(n.created_at || Date.now()).getTime() - new Date(newNotif.created_at || Date.now()).getTime()) < 60000
              );

              if (alreadyExists) {
                isDuplicate = true;
                return state;
              }

              return {
                notifications: [newNotif, ...state.notifications],
                unreadCount: state.unreadCount + (newNotif.is_read ? 0 : 1)
              };
            });

            // If it's a twin duplicate event arriving right after, suppress duplicate chime & toast
            if (isDuplicate) return;

            // Play auditory chime
            playNotificationChime();

            // Trigger In-App Interactive Toast Banner
            try {
              toast((t) => (
                React.createElement('div', {
                  onClick: () => {
                    toast.dismiss(t.id);
                    if (window.location.pathname !== '/notifications') {
                      window.location.href = '/notifications';
                    }
                  },
                  style: { cursor: 'pointer', direction: 'rtl', width: '100%' }
                }, [
                  React.createElement('div', {
                    key: 'title',
                    style: { fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#ffffff' }
                  }, newNotif.title || 'إشعار جديد'),
                  React.createElement('div', {
                    key: 'msg',
                    style: { fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }
                  }, newNotif.message || '')
                ])
              ), {
                icon: '🔔',
                duration: 6000,
                position: 'top-center',
                style: {
                  background: '#0f172a',
                  color: '#ffffff',
                  border: '1px solid #6366f1',
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                  padding: '12px 16px',
                  maxWidth: '420px'
                }
              });
            } catch (toastErr) {
              console.warn('Toast display warning:', toastErr);
            }

            // Trigger native/browser heads-up notification and vibration
            try {
              import('../lib/onesignal').then(({ showExternalNotification }) => {
                showExternalNotification({
                  title: newNotif.title || 'جيبها - إشعار جديد 📦',
                  message: newNotif.message || 'لديك تحديث جديد في حسابك',
                  url: '/notifications'
                });
              });
            } catch {}

            // Trigger global refresh for any open pages (orders, bids, requests)
            try {
              window.dispatchEvent(new CustomEvent('refresh_data'));
            } catch {}
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const updated = payload.new as Notification;
            if (!updated) return;
            set((state) => {
              const updatedList = state.notifications.map(n => n.id === updated.id ? updated : n);
              return {
                notifications: updatedList,
                unreadCount: updatedList.filter(n => !n.is_read).length
              };
            });
          }
        )
        .subscribe();

      activeChannel = channel;

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
        if (activeChannel === channel) {
          activeChannel = null;
        }
      };
    } catch (err) {
      console.warn('Realtime subscription error:', err);
      return () => {};
    }
  },

  /**
   * Zero-Background Polling: Immediately disconnects Supabase Realtime channel when app enters background.
   * Eliminates quota exhaustion and stops unnecessary background network activity.
   */
  pauseRealtime: () => {
    if (activeChannel) {
      try {
        supabase.removeChannel(activeChannel);
      } catch {}
      activeChannel = null;
      console.log('🔌 Supabase Realtime paused (App in Background / Zero-Background Polling)');
    }
  },

  /**
   * Resumes Supabase Realtime subscription only when app returns to foreground.
   */
  resumeRealtime: () => {
    if (activeUserId) {
      console.log('⚡ Supabase Realtime resumed (App in Foreground) for user:', activeUserId);
      get().fetchNotifications(activeUserId);
      get().subscribeToNotifications(activeUserId);
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

  markSingleAsRead: async (id: string) => {
    try {
      const { notifications, unreadCount } = get();
      const target = notifications.find(n => n.id === id);
      if (!target || target.is_read) return;

      // Optimistic update
      set({
        notifications: notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, unreadCount - 1)
      });

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (error) {
      console.error('Error marking single notification as read:', error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const { notifications, unreadCount } = get();
      const notifToDelete = notifications.find(n => n.id === id);
      
      // Optimistic update
      set({ 
        notifications: notifications.filter(n => n.id !== id && !(
          notifToDelete &&
          n.title === notifToDelete.title &&
          n.message === notifToDelete.message &&
          Math.abs(new Date(n.created_at).getTime() - new Date(notifToDelete.created_at).getTime()) < 60000
        )),
        unreadCount: notifToDelete && !notifToDelete.is_read ? Math.max(0, unreadCount - 1) : unreadCount
      });

      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;

      // Clean up twin duplicate row in DB if any
      if (notifToDelete) {
        const t = new Date(notifToDelete.created_at).getTime();
        const before = new Date(t - 60000).toISOString();
        const after = new Date(t + 60000).toISOString();
        await supabase.from('notifications').delete()
          .eq('user_id', notifToDelete.user_id)
          .eq('title', notifToDelete.title)
          .eq('message', notifToDelete.message)
          .gte('created_at', before)
          .lte('created_at', after);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }
}));

export const sendNotification = async (
  userId: string, 
  title: string, 
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): Promise<{ success: boolean; pushSent: boolean; pushError?: string }> => {
  try {
    if (userId === 'all_suppliers' || userId === 'all_admins') {
       const roleToFind = userId === 'all_suppliers' ? 'supplier' : 'admin';
       const { data: targetUsers } = await supabase.from('users').select('id').eq('role', roleToFind);
       let targetIds = (targetUsers && targetUsers.length > 0)
         ? targetUsers.map(u => String(u.id))
         : [];

       // Resilient fallback for admin in case anonymous select on users table is restricted
       if (targetIds.length === 0 && roleToFind === 'admin') {
         targetIds = ['eb79cb0c-00c6-4bc2-b833-d02e6f605e30'];
       }

       // 1. Direct bulk insert attempt
       let insertedDirectly = false;
       if (targetIds.length > 0) {
         const inserts = targetIds.map(id => ({
           user_id: id,
           title,
           message,
           type
         }));
         const { error: insertErr } = await supabase.from('notifications').insert(inserts);
         if (!insertErr) {
           insertedDirectly = true;
         } else {
           console.warn('Direct bulk notifications insert blocked (RLS). Falling back to SECURITY DEFINER RPC:', insertErr);
         }
       }

       // 2. Fallback to SECURITY DEFINER RPC for each target user
       if (!insertedDirectly && targetIds.length > 0) {
         for (const id of targetIds) {
           try {
             await supabase.rpc('send_user_notification', {
               p_user_id: id,
               p_title: title,
               p_message: message,
               p_type: type
             });
           } catch (rpcErr) {
             console.error('send_user_notification RPC error for target:', id, rpcErr);
           }
         }
       }

       // 3. Dispatch push notification to all target mobile devices via Edge Function
       let pushSent = false;
       let pushError: string | undefined;
       try {
         const pushRes = await sendPushNotification({
           userIds: targetIds.length > 0 ? targetIds : undefined,
           targetRole: roleToFind,
           title,
           message,
           data: { type, role: roleToFind },
           skipDbInsert: true
         });
         pushSent = Boolean(pushRes);
       } catch (pushErr: any) {
         pushError = pushErr?.message || 'فشل إرسال إشعار الهاتف';
         console.error('OneSignal Push Error (role broadcast):', pushErr);
       }
       return { success: true, pushSent, pushError };
    }

    const { error: insertErr } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type
    });

    if (insertErr) {
      console.warn('Direct notification insert failed (trying RPC):', insertErr);
      await supabase.rpc('send_user_notification', {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_type: type
      });
    }

    // Dispatch push notification to target user's mobile via OneSignal API
    let pushSent = false;
    let pushError: string | undefined;
    try {
      const pushRes = await sendPushNotification({
        userIds: [String(userId)],
        title,
        message,
        data: { type },
        skipDbInsert: true
      });
      pushSent = Boolean(pushRes);
    } catch (pushErr: any) {
      pushError = pushErr?.message || 'تعذر إيقاظ الهاتف بالخلفية';
      console.warn('OneSignal Push Dispatch Warning:', pushErr);
      if (pushErr?.message && (pushErr.message.includes('401') || pushErr.message.includes('غير مصرح') || pushErr.message.includes('Unauthorized') || pushErr.message.includes('Access denied'))) {
        toast('وصل التنبيه لجرس الموقع، لكن إشعار الهاتف بالخلفية متوقف (مفتاح OneSignal غير صالح أو منتهي). يمكنك تحديثه من إدارة الإشعارات.', {
          icon: '⚠️',
          duration: 8000
        });
      }
    }

    return { success: true, pushSent, pushError };
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return { success: false, pushSent: false, pushError: error?.message };
  }
};
