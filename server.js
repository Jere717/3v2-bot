require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { generarQR } = require('./utils/qr'); // Asegúrate de que la ruta sea correcta
const { getSheetConfig } = require('./utils/googleSheets');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());

let qrString = null;
let clientReady = false;

const puppeteerArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--single-process',
  '--disable-gpu'
];

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './sessions' }),
  puppeteer: {
    args: puppeteerArgs,
    headless: true,
    defaultViewport: null,
  }
});

// Forzar user-agent realista cuando se abre el navegador
client.on('browser_open', async (browser) => {
  try {
    const [page] = await browser.pages();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    console.log('User-Agent personalizado aplicado a Puppeteer');
  } catch (err) {
    console.error('Error aplicando User-Agent:', err);
  }
});

client.on('qr', async (qr) => {
  qrString = qr;
  clientReady = false;
  console.log('QR recibido, esperando escaneo...');
  // Generar y guardar el QR como imagen PNG
  try {
    const qrImagePath = path.join(__dirname, 'qr.png');
    await qrcode.toFile(qrImagePath, qr);
  } catch (err) {
    console.error('Error guardando QR como imagen:', err);
  }
});

client.on('ready', () => {
  clientReady = true;
  qrString = null;
  console.log('WhatsApp conectado y listo!');
});

client.on('disconnected', (reason) => {
  console.log('Cliente desconectado:', reason);
});

async function getMistralResponse(userMessage, config) {
  // El token está en config[7][3] (fila 8, columna 4)
  const mistralToken = config[7][3];
  if (!mistralToken) throw new Error('Token de Mistral no configurado en el Sheet.');
  // Puedes personalizar el prompt/contexto usando otras celdas del Sheet
  const contexto = (config[8] && config[8][1]) ? config[8][1] : '';
  const prompt = `${contexto}\nUsuario: ${userMessage}\nBot:`;

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mistralToken}`
    },
    body: JSON.stringify({
      model: 'mistral-medium', // Puedes parametrizar esto desde el Sheet si lo deseas
      messages: [
        { role: 'system', content: contexto },
        { role: 'user', content: userMessage }
      ]
    })
  });
  if (!res.ok) throw new Error('Error en la API de Mistral: ' + (await res.text()));
  const data = await res.json();
  return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content.trim() : 'No hay respuesta de Mistral.';
}

client.on('message', async msg => {
  try {
    const config = await getSheetConfig();
    // Leer whitelist activada y lista de números desde la columna J (índice 9)
    const whitelistActive = (config[1][9] + '').toUpperCase() === 'SI'; // J2
    const whitelistNumbers = (config[2][9] + '').split('-').map(n => n.trim()); // J3
    const senderNumber = msg.from.replace(/@c\.us$/, ''); // Quita el sufijo de WhatsApp

    if (whitelistActive && !whitelistNumbers.includes(senderNumber)) {
      console.log('Mensaje ignorado de', senderNumber, 'por whitelist.');
      return; // Ignora mensajes de números no autorizados
    }

    const respuesta = await getMistralResponse(msg.body, config);
    await msg.reply(respuesta);
  } catch (err) {
    console.error('Error al responder con Mistral:', err);
    await msg.reply('Ocurrió un error al consultar la IA.');
  }
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
    // Devolver el texto y la URL pública de la imagen
    const qrUrl = req.protocol + '://' + req.get('host') + '/qr.png';
    res.json({ status: '0', qr_texto: qrString, qr_url: qrUrl });
  } else if (clientReady) {
    res.json({ status: '1', message: 'Ya conectado' });
  } else {
    res.json({ status: '-1', message: 'Esperando QR...' });
  }
});

// Endpoint para servir la imagen QR
app.get('/qr.png', (req, res) => {
  const qrImagePath = path.join(__dirname, 'qr.png');
  if (fs.existsSync(qrImagePath)) {
    res.sendFile(qrImagePath);
  } else {
    res.status(404).send('QR no generado');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
