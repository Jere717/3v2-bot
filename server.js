require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { generarQR } = require('./utils/qr'); // Asegúrate de que la ruta sea correcta
// const { getSheetConfig, updateSheet } = require('./utils/googleSheets'); // Uncomment when utils ready
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(bodyParser.json());

let qrString = null;
let clientReady = false;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './sessions' }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  qrString = qr;
  clientReady = false;
  console.log('QR recibido, esperando escaneo...');
});

client.on('ready', () => {
  clientReady = true;
  qrString = null;
  console.log('WhatsApp conectado y listo!');
});

client.on('message', async msg => {
  // Aquí puedes consultar el Sheet y responder usando Mistral
  // const config = await getSheetConfig();
  // const mistralReply = await getMistralResponse(msg.body, config);
  // msg.reply(mistralReply);
  // await logToSheet(msg.from, msg.body, mistralReply);
  msg.reply('¡Hola! Bot activo.');
});

client.initialize();

// Endpoint para recibir eventos (simula doPost)
app.post('/webhook', async (req, res) => {
  const { op, ...data } = req.body;
  let respuesta = {};

  if (op === 'qr') {
    // Lógica para generar y devolver QR
    // El texto a convertir en QR debe venir en data.text o similar
    const textoQR = data.text || 'https://web.whatsapp.com/'; // Cambia esto según tu flujo
    try {
      const qrDataUrl = await generarQR(textoQR);
      respuesta = { status: '0', message: 'QR generado', qr: qrDataUrl };
    } catch (err) {
      respuesta = { status: '-1', message: err.message };
    }
  } else if (op === 'obtenersheet') {
    // Devuelve configuración de la sheet
    // const config = await getSheetConfig();
    // respuesta = { status: '0', configuracion: config };
    respuesta = { status: '0', configuracion: {} };
  } else if (op === 'registermessage') {
    // Procesa mensajes, llama a Mistral, etc.
    respuesta = { status: '0', message: 'Mensaje procesado' };
  }
  // ...otros casos según tu lógica

  res.json(respuesta);
});

// Endpoint para healthcheck
app.get('/', (req, res) => res.send('Bot activo'));

app.get('/qr', async (req, res) => {
  if (qrString) {
    const qrDataUrl = await qrcode.toDataURL(qrString);
    res.json({ status: '0', qr: qrDataUrl });
  } else if (clientReady) {
    res.json({ status: '1', message: 'Ya conectado' });
  } else {
    res.json({ status: '-1', message: 'Esperando QR...' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
