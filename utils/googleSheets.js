// utils/googleSheets.js
// Aquí irán las funciones para interactuar con Google Sheets usando googleapis
// Ejemplo de esqueleto:

// const { google } = require('googleapis');
// const sheets = google.sheets('v4');
const fetch = require('node-fetch');

// Cambia esta URL por la de tu App Script desplegado
const SHEET_CONFIG_URL = 'https://script.google.com/macros/s/AKfycbytspTzI1qZvRT3uVWoFp9jEdNjuAa0sy4WIDNVXbE8nv4ps7WvE3QCK9Rha3NVhf-P/exec';

async function getSheetConfig() {
  const res = await fetch(SHEET_CONFIG_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'obtenersheet' })
  });
  const data = await res.json();
  if (data.status !== '0') throw new Error('No se pudo obtener la configuración del Sheet: ' + data.message);
  return data.configuracion;
}

module.exports = { getSheetConfig };
