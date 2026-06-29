

const secretKey = 'test_sk_H54bwKul5orwX3WFex7GjvxxCPNmCdNAiqB5sLEY';
const baseUrl = 'https://pay.chargily.net/test/api/v2';

async function test() {
  const customerData = {
    name: 'عبد الرحمن',
    email: 'elightfut@gmail.com',
  };

  let customer_id = undefined;

  const payload = {
    name: customerData.name || 'Unknown',
    email: customerData.email,
  };

  const custRes = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (custRes.ok) {
    const custData = await custRes.json();
    customer_id = custData.id;
    console.log("Created customer:", customer_id);
  } else {
    console.log("Customer failed:", await custRes.text());
  }

  const checkoutRes = await fetch(`${baseUrl}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 100,
      currency: 'dzd',
      success_url: 'http://localhost:5173',
      failure_url: 'http://localhost:5173',
      customer_id: customer_id,
    })
  });

  if (checkoutRes.ok) {
    const checkoutData = await checkoutRes.json();
    console.log("Checkout URL:", checkoutData.checkout_url);
  } else {
    console.log("Checkout failed:", await checkoutRes.text());
  }
}

test();
