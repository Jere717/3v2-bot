// utils/googleSheets.js
// Funciones para interactuar con Google Sheets usando googleapis y una cuenta de servicio
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.SHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';

function getAuth() {
  const credentials = JSON.parse(fs.readFileSync(path.resolve(CREDENTIALS_PATH), 'utf8'));
  const { client_email, private_key } = credentials;
  return new google.auth.JWT(client_email, null, private_key, SCOPES);
}

// Lee un rango de una hoja
async function getSheet(sheetName, range) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!${range}`
  });
  return res.data.values;
}

// Lee toda la hoja como matriz
async function getAllSheet(sheetName) {
  return getSheet(sheetName, 'A1:Z1000');
}

// Escribe una fila al final de la hoja
async function appendRow(sheetName, values) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] }
  });
}

// Escribe en una celda específica
async function updateCell(sheetName, cell, value) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!${cell}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[value]] }
  });
}

// Lee la configuración (prompt base, etc) de la hoja "Configuracion"
async function getSheetConfig() {
  const config = await getAllSheet('Configuracion');
  // Devuelve como objeto clave:valor usando la primera columna como clave y la segunda como valor
  const result = {};
  config.forEach(row => {
    if (row[0] && row[1]) result[row[0]] = row[1];
  });
  return result;
}

// Ejemplo: leer pedidos
async function getPedidos() {
  return getAllSheet('Pedidos');
}

// Ejemplo: registrar un pedido
async function registrarPedido(datos) {
  // datos debe ser un array en el orden de las columnas de la hoja "Pedidos"
  await appendRow('Pedidos', datos);
}

module.exports = {
  getSheet,
  getAllSheet,
  appendRow,
  updateCell,
  getSheetConfig,
  getPedidos,
  registrarPedido,
  SHEET_ID
};
