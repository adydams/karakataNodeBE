const QRCode = require("qrcode");

async function generateProductQRCode(productId) {
  const url = `https://myshop.com/products/${productId}`;
  const qr = await QRCode.toDataURL(url); // returns base64 image string
  return qr;
}
