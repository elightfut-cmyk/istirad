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
    const { userIds, subscriptionIds, title, message, data, sendToAll } = req.body || {};
    const ENCODED_REST_KEY = 'b3NfdjJfYXBwXzNsdm82c21yZXZocGZja3FucWNjY3FicjdiaDJ2am1paXRldHV5cHZmbjMyaG9scjN5eGhldDJvYmtubWx5N2Y0ZXhxdG5ucmVrb2M2bW55ampkN3NwYTJ0NGJhZGhhZnQ2NjM1bjdh';
    const fallbackKey = Buffer.from(ENCODED_REST_KEY, 'base64').toString('utf8');
    const apiKey = process.env.ONESIGNAL_REST_API_KEY || process.env.VITE_ONESIGNAL_REST_API_KEY || fallbackKey;
    const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID || 'daeaef49-9125-4ef2-8950-6c0428063f09';

    if (!apiKey) {
      console.warn('ONESIGNAL_REST_API_KEY is not configured on the server');
      return res.status(400).json({ error: 'ONESIGNAL_REST_API_KEY is not configured on the server.' });
    }

    const rawIds = Array.isArray(userIds) ? userIds : [userIds];
    const externalIds = rawIds.filter(Boolean).map(id => String(id));
    const rawSubIds = Array.isArray(subscriptionIds) ? subscriptionIds : (subscriptionIds ? [subscriptionIds] : []);
    const validSubIds = rawSubIds.filter(Boolean).map(id => String(id));

    if (!sendToAll && externalIds.length === 0 && validSubIds.length === 0) {
      return res.status(400).json({ error: 'No user or subscription IDs provided' });
    }

    const authHeader = apiKey.startsWith('Basic ') || apiKey.startsWith('Key ')
      ? apiKey
      : (apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`);

    const payload = {
      app_id: appId,
      priority: 10,
      existing_android_channel_id: 'jibha_channel',
      android_accent_color: 'FF4F46E5',
      android_sound: 'default',
      android_visibility: 1,
      headings: {
        en: title,
        ar: title
      },
      contents: {
        en: message,
        ar: message
      },
      data: data || {}
    };

    if (sendToAll) {
      payload.included_segments = ['Subscribed Users', 'Total Subscriptions'];
    } else {
      if (validSubIds.length > 0) {
        payload.include_subscription_ids = validSubIds;
      }
      if (externalIds.length > 0) {
        payload.include_aliases = {
          external_id: externalIds
        };
        payload.include_external_user_ids = externalIds;
        payload.channel_for_external_user_ids = 'push';
      }
      payload.target_channel = 'push';
    }

    let response;
    let resData;
    try {
      response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });
      resData = await response.json();
    } catch {
      response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });
      resData = await response.json();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(response.status).json(resData);
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: error.message });
  }
}
