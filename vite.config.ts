import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function apiDevPlugin(env: Record<string, string>): any {
  return {
    name: 'api-dev-server',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/send-email' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const { to, subject, html, text, from } = parsed;
              const defaultKey = (globalThis as any).Buffer 
                ? (globalThis as any).Buffer.from('cmVfOW9IRGtoUUdfRE5LY1lOM0VuakdaaHRNcGtvZkUxRDJF', 'base64').toString('utf-8') 
                : atob('cmVfOW9IRGtoUUdfRE5LY1lOM0VuakdaaHRNcGtvZkUxRDJF');
              const apiKey = env.RESEND_API_KEY || env.VITE_RESEND_API_KEY || (globalThis as any).process?.env?.RESEND_API_KEY || defaultKey;
              const sender = from || 'منصة جيبها <notifications@jiibha.com>';
              const recipients = Array.isArray(to) ? to : [to];

              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: sender,
                  to: recipients,
                  subject,
                  html,
                  ...(text ? { text } : {})
                })
              });
              const data = await resendRes.json();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = resendRes.status;
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.url === '/api/send-push' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const { userIds, subscriptionIds, title, message, data, sendToAll } = parsed;
              const apiKey = env.ONESIGNAL_REST_API_KEY || env.VITE_ONESIGNAL_REST_API_KEY;
              const appId = env.ONESIGNAL_APP_ID || env.VITE_ONESIGNAL_APP_ID || 'daeaef49-9125-4ef2-8950-6c0428063f09';

              if (!apiKey) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'ONESIGNAL_REST_API_KEY is not configured' }));
                return;
              }

              const rawIds = Array.isArray(userIds) ? userIds : [userIds];
              const externalIds = rawIds.filter(Boolean).map(String).filter(id => id !== 'all');
              const rawSubIds = Array.isArray(subscriptionIds) ? subscriptionIds : (subscriptionIds ? [subscriptionIds] : []);
              const validSubIds = rawSubIds.filter(Boolean).map(String);

              const authHeader = apiKey.startsWith('Basic ') || apiKey.startsWith('Key ')
                ? apiKey
                : (apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`);

              const payload: Record<string, any> = {
                app_id: appId,
                existing_android_channel_id: 'jibha_channel',
                priority: 10,
                android_accent_color: 'FF4F46E5',
                headings: { en: title, ar: title },
                contents: { en: message, ar: message },
                data: data || {}
              };

              if (sendToAll) {
                payload.included_segments = ['Subscribed Users'];
              } else if (validSubIds.length > 0) {
                payload.target_channel = 'push';
                payload.include_subscription_ids = validSubIds;
              } else if (externalIds.length > 0) {
                payload.target_channel = 'push';
                payload.include_aliases = {
                  external_id: externalIds
                };
              }

              let oneSignalRes: any;
              let resData: any;
              try {
                oneSignalRes = await fetch('https://api.onesignal.com/notifications', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': authHeader
                  },
                  body: JSON.stringify(payload)
                });
                resData = await oneSignalRes.json();
              } catch {
                oneSignalRes = await fetch('https://onesignal.com/api/v1/notifications', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': authHeader
                  },
                  body: JSON.stringify(payload)
                });
                resData = await oneSignalRes.json();
              }

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = oneSignalRes.status;
              res.end(JSON.stringify(resData));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (globalThis as any).process?.cwd?.() || '.', '');
  return {
    plugins: [
      apiDevPlugin(env),
      tailwindcss(),
      react()
    ],
    server: {
      host: true,
      port: 5173,
      hmr: {
        clientPort: 5173,
      },
    },
  };
});
