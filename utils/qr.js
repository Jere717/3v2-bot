// Este archivo implementa la generación de QR para WhatsApp Web usando 'qrcode' y responde al endpoint '/webhook' con el QR en base64.
// Instala la dependencia: npm install qrcode

const qrcode = require('qrcode');

async function generarQR(texto) {
  // Genera un QR en base64 a partir del texto recibido
  try {
    const qrDataUrl = await qrcode.toDataURL(texto);
    return qrDataUrl;
  } catch (err) {
    throw new Error('Error generando QR: ' + err.message);
  }
}

module.exports = { generarQR };
