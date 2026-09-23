export default async function handler(req, res) {
  // Add CORS headers for preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Ensure this is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing imageUrl in request body' });
    }

    // Use RAPIDAPI_KEY from Vercel Environment Variables
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'RAPIDAPI_KEY is not configured on the server' });
    }

    // Call RapidAPI securely from the server
    const rapidApiRes = await fetch('https://alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com/search/aliexpress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      },
      body: JSON.stringify({ imageUrl })
    });

    if (!rapidApiRes.ok) {
      const errorText = await rapidApiRes.text();
      console.error('RapidAPI Error:', rapidApiRes.status, errorText);
      return res.status(rapidApiRes.status).json({ error: `RapidAPI returned ${rapidApiRes.status}` });
    }

    const data = await rapidApiRes.json();
    
    // Return the response back to the React app
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);

  } catch (error) {
    console.error('Serverless Function Error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
