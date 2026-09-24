const RAPIDAPI_KEY = "70ce2ef3e8mshc1e2d39c2a3d623p166ef2jsnf91121818898";
const imageUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400";

async function test() {
  try {
    const lensUrl = "https://alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com/search/alibaba";
    const lensOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY
      },
      body: JSON.stringify({ imageUrl })
    };

    const res = await fetch(lensUrl, lensOptions);
    const data = await res.json();
    console.log("Full Lens API Response:", JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}

test();
