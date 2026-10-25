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
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
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
        payload.include_player_ids = validSubIds;
      } else if (externalIds.length > 0) {
        const filters = [];
        externalIds.forEach((id, idx) => {
          if (idx > 0) filters.push({ operator: 'OR' });
          filters.push({ field: 'tag', key: 'user_id', relation: '=', value: String(id) });
        });
        payload.filters = filters;
      }
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
