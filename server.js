require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const BotLogic = require('./utils/botLogic');
const WhatsAppClient = require('./utils/whatsappClient');
const MistralAIClient = require('./utils/mistralClient');


const path = require('path');
const app = express();
app.use(cors());
app.use(bodyParser.json());
// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

const SHEET_ID = process.env.SHEET_ID;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const bot = BotLogic;

const whatsappClient = new WhatsAppClient();
const mistralClient = new MistralAIClient(MISTRAL_API_KEY);

// Control de inicio/parada del cliente WhatsApp
let waActive = false;

app.post('/wa/start', (req, res) => {
  if (!waActive) {
    whatsappClient.initialize();
    waActive = true;
    res.json({ status: '0', message: 'Cliente WhatsApp iniciado.' });
  } else {
    res.json({ status: '-1', message: 'Ya está iniciado.' });
  }
});

app.post('/wa/stop', (req, res) => {
  if (waActive) {
    whatsappClient.destroy();
    waActive = false;
    res.json({ status: '0', message: 'Cliente WhatsApp detenido.' });
  } else {
    res.json({ status: '-1', message: 'Ya está detenido.' });
  }
});


// Cooldown y control de pausa para generación de QR
let lastQRTime = 0;
const QR_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutos
let qrPaused = false;

app.post('/qr/pause', (req, res) => {
  qrPaused = true;
  res.json({ status: '0', message: 'Generación de QR pausada.' });
});

app.post('/qr/resume', (req, res) => {
  qrPaused = false;
  res.json({ status: '0', message: 'Generación de QR reanudada.' });
});

app.get('/qr/generate', (req, res) => {
  if (qrPaused) {
    return res.json({ status: '-3', message: 'La generación de QR está pausada.' });
  }
  const now = Date.now();
  const qr = whatsappClient.getQRCode();
  if (qr) {
    lastQRTime = now;
    res.json({ status: '0', qr });
  } else if (whatsappClient.isReady()) {
    res.json({ status: '0', message: 'CONECTADO' });
  } else if (now - lastQRTime < QR_COOLDOWN_MS) {
    const waitSec = Math.ceil((QR_COOLDOWN_MS - (now - lastQRTime)) / 1000);
    res.json({ status: '-2', message: `Espera ${waitSec} segundos antes de pedir otro QR para evitar bloqueo.` });
  } else {
    lastQRTime = now;
    res.json({ status: '-1', message: 'Generando QR...' });
  }
});

// Endpoint para enviar mensaje por WhatsApp
app.post('/message', async (req, res) => {
  try {
    const { number, message } = req.body;
    const response = await whatsappClient.sendMessage(number, message);
    res.json({ status: '0', message: 'Mensaje enviado', response });
  } catch (error) {
    res.status(500).json({ status: '-1', message: error.message });
  }
});

// Endpoint para respuesta IA
app.post('/ai', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await mistralClient.generateResponse(prompt);
    res.json({ status: '0', response });
  } catch (error) {
    res.status(500).json({ status: '-1', message: error.message });
  }
});

// Endpoint para obtener configuración
app.get('/sheet/config', async (req, res) => {
  try {
    const config = await bot.obtenerConfiguracion();
    res.json({ status: '0', config });
  } catch (error) {
    res.status(500).json({ status: '-1', message: error.message });
  }
});

// Endpoint para obtener inventario
app.get('/sheet/inventario', async (req, res) => {
  try {
    const inventario = await bot.obtenerDatosInventarios();
    res.json({ status: '0', inventario });
  } catch (error) {
    res.status(500).json({ status: '-1', message: error.message });
  }
});

// Endpoint para registrar pedido
app.post('/sheet/pedido', async (req, res) => {
  try {
    const { datos } = req.body;
    await bot.registrarPedido(datos);
    res.json({ status: '0', message: 'Pedido registrado' });
  } catch (error) {
    res.status(500).json({ status: '-1', message: error.message });
  }
});

// Endpoint para obtener blacklist
app.get('/sheet/blacklist', async (req, res) => {
  try {
    const blacklist = await bot.obtenerblacklist();
    res.json({ status: '0', blacklist });
  } catch (error) {
    res.status(500).json({ status: '-1', message: error.message });
  }
});

// Endpoint para actualizar blacklist
app.post('/sheet/blacklist', async (req, res) => {
  try {
    const { operacion } = req.body;
    const result = await bot.actualizarblacklist(operacion);
    res.json({ status: '0', blacklist: result });
  } catch (error) {
    res.status(500).json({ status: '-1', message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
