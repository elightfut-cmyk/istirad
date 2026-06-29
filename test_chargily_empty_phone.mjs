const secretKey = 'test_sk_H54bwKul5orwX3WFex7GjvxxCPNmCdNAiqB5sLEY';
const baseUrl = 'https://pay.chargily.net/test/api/v2';

async function test() {
  const custRes = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'عبد الرحمن',
      email: 'elightfut@gmail.com',
      phone: '', // empty string
    })
  });
  
  if (custRes.ok) {
    const data = await custRes.json();
    console.log("Customer created:", data.id);
  } else {
    const err = await custRes.text();
    console.log("Customer creation failed:", err);
  }
}

test();
