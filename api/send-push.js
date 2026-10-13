export default async function handler(req, res) {
  // Add CORS headers for preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Ensure this is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userIds, title, message, data } = req.body || {};
    const ENCODED_REST_KEY = 'b3NfdjJfYXBwXzNsdm82c21yZXZocGZja3FucWNjcWJyN2JoM2Y3bTRoamgydXE0NG82bmF6ZTM1ZXhrdzJsc3ZlaXVubHg2Z213b2p3emxkb2d6dGhmbHZucTMyazZrZWZ5czZhbWptc2F1MnJnY2k=';
    const fallbackKey = Buffer.from(ENCODED_REST_KEY, 'base64').toString('utf8');
    const apiKey = process.env.ONESIGNAL_REST_API_KEY || process.env.VITE_ONESIGNAL_REST_API_KEY || fallbackKey;
    const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID || 'daeaef49-9125-4ef2-8950-6c0428063f09';

    if (!apiKey) {
      console.warn('ONESIGNAL_REST_API_KEY is not configured on the server');
      return res.status(400).json({ error: 'ONESIGNAL_REST_API_KEY is not configured on the server.' });
    }

    const rawIds = Array.isArray(userIds) ? userIds : [userIds];
    const externalIds = rawIds.filter(Boolean).map(id => String(id));

    if (externalIds.length === 0) {
      return res.status(400).json({ error: 'No user IDs provided' });
    }

    const authHeader = apiKey.startsWith('Basic ') || apiKey.startsWith('Key ')
      ? apiKey
      : (apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`);

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: {
          external_id: externalIds
        },
        include_external_user_ids: externalIds,
        channel_for_external_user_ids: 'push',
        target_channel: 'push',
        priority: 10,
        android_accent_color: 'FF4F46E5',
        android_sound: 'default',
        headings: {
          en: title,
          ar: title
        },
        contents: {
          en: message,
          ar: message
        },
        data: data || {}
      })
    });

    const resData = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(response.status).json(resData);
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: error.message });
  }
}
