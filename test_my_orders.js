const axios = require('axios');
async function test() {
  try {
    // Use a dummy token or a known valid one if possible. 
    // Since I don't have one, I'll just try the request and see if it's a 401 (Auth) or 500 (DB Error).
    const res = await axios.get('http://localhost:5000/api/orders/my-orders', {
      headers: { Authorization: 'Bearer dummy-token' }
    });
    console.log('Status:', res.status);
  } catch (err) {
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}
test();
