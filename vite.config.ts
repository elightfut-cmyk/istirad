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
              const apiKey = env.RESEND_API_KEY || env.VITE_RESEND_API_KEY || (globalThis as any).process?.env?.RESEND_API_KEY;
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
