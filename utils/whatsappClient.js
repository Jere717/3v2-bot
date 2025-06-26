// utils/whatsappClient.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');


class WhatsAppClient {
  constructor() {
    this.qrCode = null;
    this.ready = false;
    this.client = null;
    this.initialized = false;
  }

  initialize() {
    // Siempre crea una nueva instancia limpia
    if (this.client) {
      try { this.client.destroy(); } catch (e) {}
      this.client = null;
    }
    this.qrCode = null;
    this.ready = false;
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './sessions' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        defaultViewport: null
      }
    });
    this.client.on('qr', async (qr) => {
      this.qrCode = await qrcode.toDataURL(qr);
      const qrImagePath = path.join(__dirname, '../qr.png');
      await qrcode.toFile(qrImagePath, qr);
      console.log('QR Code generado');
    });
    this.client.on('ready', () => {
      this.ready = true;
      this.qrCode = null;
      console.log('WhatsApp listo');
    });
    this.client.on('disconnected', (reason) => {
      this.ready = false;
      console.log('Cliente desconectado:', reason);
    });
    this.client.initialize();
  }

  destroy() {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      this.initialized = false;
      this.ready = false;
      this.qrCode = null;
      console.log('WhatsApp client destruido');
    }
  }

  initialize() {
    this.client.on('qr', async (qr) => {
      this.qrCode = await qrcode.toDataURL(qr);
      const qrImagePath = path.join(__dirname, '../qr.png');
      await qrcode.toFile(qrImagePath, qr);
      console.log('QR Code generado');
    });

    this.client.on('ready', () => {
      this.ready = true;
      this.qrCode = null;
      console.log('WhatsApp listo');
    });

    this.client.on('disconnected', (reason) => {
      this.ready = false;
      console.log('Cliente desconectado:', reason);
    });

    this.client.initialize();
  }

  async sendMessage(number, message) {
    if (!this.ready) throw new Error('WhatsApp client is not ready');
    return this.client.sendMessage(number, message);
  }

  getQRCode() {
    return this.qrCode;
  }

  isReady() {
    return this.ready;
  }
}

module.exports = WhatsAppClient;
