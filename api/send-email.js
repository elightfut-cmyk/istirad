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
    const { to, subject, html, text, from } = req.body || {};

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and html are required.' 
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server' });
    }

    // Default sender uses the verified jiibha.com domain
    const sender = from || 'منصة جيبها <notifications@jiibha.com>';
    const recipients = Array.isArray(to) ? to : [to];

    // Filter valid email formats roughly
    const validRecipients = recipients.filter(email => typeof email === 'string' && email.includes('@'));
    if (validRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email address provided.' });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: sender,
        to: validRecipients,
        subject,
        html,
        ...(text ? { text } : {})
      })
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API Error:', resendResponse.status, data);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(resendResponse.status).json({ 
        error: data.message || 'Failed to send email via Resend',
        details: data 
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ 
      success: true, 
      id: data.id, 
      recipients: validRecipients 
    });

  } catch (error) {
    console.error('Send Email Error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}
