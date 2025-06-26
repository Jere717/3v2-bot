// utils/botLogic.js
// Lógica migrada y fusionada del Apps Script para Node.js
const sheets = require('./googleSheets');

// --- Configuración y helpers ---
async function getRowsConfig() {
  return await sheets.getAllSheet('Configuracion');
}

// --- Blacklist y Whitelist ---
async function obtenerblacklist() {
  const data = await sheets.getAllSheet('BlackListBOT');
  return [...new Set(data.map(item => item[0]))].toString();
}
async function obtenerwhitelist() {
  const data = await sheets.getAllSheet('WhiteListBOT');
  return [...new Set(data.map(item => item[0]))].toString();
}
async function actualizarblacklist(operacion) {
  await sheets.appendRow('BlackListBOT', [operacion]);
  return await obtenerblacklist();
}

// --- Inventario ---
async function obtenerDatosInventarios() {
  const inventario = await sheets.getAllSheet('Inventario');
  if (!inventario || inventario.length < 2) return [];
  const headers = inventario[0].map(h => h.replace(/ /g, '_'));
  return inventario.slice(1).map(row => {
    const item = {};
    headers.forEach((h, i) => item[h] = row[i]);
    return item;
  });
}

// --- Configuración general ---
async function obtenerConfiguracion() {
  const config = await sheets.getAllSheet('Configuracion');
  // Devuelve como objeto clave:valor usando la primera columna como clave y la segunda como valor
  const result = {};
  config.forEach(row => {
    if (row[0] && row[1]) result[row[0]] = row[1];
  });
  return result;
}

// --- Mensajes manuales ---
async function obtenerMensajesManuales() {
  return await sheets.getAllSheet('MensajeManual');
}

// --- Pedidos ---
async function registrarPedido(datos) {
  await sheets.appendRow('Pedidos', datos);
}

// --- Utilidades de celdas ---
async function actualizarCelda(sheet, cell, value) {
  await sheets.updateCell(sheet, cell, value);
}

// --- Lógica de reemplazo de texto (plantillas) ---
function generartextokey(data, textoemail) {
  textoemail = String(textoemail);
  Object.entries(data).forEach(([key, value]) => {
    if (value && key !== "productos") {
      textoemail = textoemail.replaceAll(`@${key}@`, value);
    }
  });
  const productos = data.productos || [];
  for (let i = 0; i < 15; i++) {
    const producto = productos[i];
    const reemplazos = [
      [`@productos${i + 1}@`, producto ? producto.nombre : ""],
      [`@cantidad${i + 1}@`, producto ? producto.cantidad : ""],
      [`@precio${i + 1}@`, producto ? producto.precio : ""],
      [`@subtotal${i + 1}@`, producto ? producto.subtotal : ""]
    ];
    reemplazos.forEach(([placeholder, valor]) => {
      textoemail = textoemail.replaceAll(placeholder, valor);
    });
  }
  return textoemail;
}

// --- Lógica de conversación y utilidades avanzadas ---
// Obtener evento de conversación (flujo tipo menu)
async function obtenerevento(numero_enviar, mensaje_buscar) {
  try {
    const rows = await sheets.getAllSheet('Conversacion');
    let evento = rows.find(item => (item[1] + '').toUpperCase().split(';').includes(mensaje_buscar.toUpperCase()));
    const evento_error = rows.find(item => item[0] === 'Error');
    const evento_start = rows.find(item => item[0] === 'Start');
    let id_fila = -1;
    // Aquí podrías usar una base de datos/cache para conversaciones si lo deseas
    if (!evento) evento = evento_error;
    return {
      status: '0',
      numero: numero_enviar,
      mensaje_entrada: mensaje_buscar,
      evento: evento[0],
      retornar: evento[3],
      mensaje_salida: evento[2],
      id_fila
    };
  } catch (e) {
    return { status: '-1', message: e.toString() };
  }
}

// Generar mensajes de salida (con blacklist, links, etc)
async function generarmensajes(salida, numero_enviar) {
  const mensajes = [];
  // Blacklist (opcional, puedes descomentar si quieres que se aplique aquí)
  // await aplicarblacklist(salida, numero_enviar);
  // URLs
  const urls = (salida + '').match(/<url>.*?<\/url>/g) || [];
  urls.forEach(url => {
    salida = salida.replace(url, '');
    mensajes.push({ tipo: 'url', nombrearchivo: 'archivo', mensaje_salida: url.replace('<url>', '').replace('</url>', '') });
  });
  // Mapas
  const mapas = (salida + '').match(/<mapa>.*?<\/mapa>/g) || [];
  mapas.forEach(mapa => {
    salida = salida.replace(mapa, '');
    mensajes.push({ tipo: 'location', nombrearchivo: 'archivo', mensaje_salida: mapa.replace('<mapa>', '').replace('</mapa>', '') });
  });
  // Archivos
  const registros = (salida.match(/https:\/\/[\S]+\.(png|jpg|jpeg|pdf|mp3|ogg)/gi)) || [];
  registros.forEach(registro => {
    salida = salida.replace(registro, '[ver 👇]');
    mensajes.push({ tipo: 'url', nombrearchivo: 'archivo', mensaje_salida: registro });
  });
  mensajes.unshift({ tipo: 'mensaje', mensaje_salida: salida.trim() });
  return mensajes;
}

// Obtener post-solicitud
async function obtenerpostsolicitud() {
  return await sheets.getAllSheet('PostSolicitud');
}

// Función para registrar solicitudes
async function registrarsolicitudes(resultado) {
  // Esta función debe adaptarse según tu lógica de negocio
  // Ejemplo: registrar en hoja 'Solicitudes'
  const fila = [new Date().toISOString(), resultado.idpersona, 'SOLICITADO', resultado.mensaje];
  await sheets.appendRow('Solicitudes', fila);
  return { status: '0', message: 'OK' };
}

// Validar número (actualiza hoja Validacion)
async function validanumero(resultado) {
  if (resultado.validar_numero && resultado.validar_numero.length > 0) {
    for (let i = 0; i < resultado.validar_numero.length; i++) {
      const row = 2 + parseInt(resultado.validar_numero[i].posicion);
      await sheets.updateCell('Validacion', `B${row}`, resultado.validar_numero[i].estado);
    }
  }
  return { status: '0', message: 'Se grabó el registro' };
}

// Agregar grupo de contactos
async function agregargrupocontactos(datos) {
  // datos: array de objetos {numero, nombreGrupo}
  for (const { numero, nombreGrupo } of datos) {
    await sheets.appendRow('GruposParticipantes', [numero, nombreGrupo]);
  }
  return { status: '0', message: 'Grupos/contactos agregados' };
}

// Recuperar contactos
async function recuperarcontactos(contactos) {
  for (const contacto of contactos) {
    await sheets.appendRow('Contactos', [contacto.id_contacto, contacto.nombre_contacto]);
  }
  return { status: '0', message: 'Contactos grabados' };
}

// Recuperar grupos
async function recuperargrupos(grupos) {
  for (const grupo of grupos) {
    await sheets.appendRow('Grupos', [grupo.id_grupo, grupo.nombre_grupo]);
  }
  return { status: '0', message: 'Grupos grabados' };
}

// Exporta todas las funciones migradas
module.exports = {
  getRowsConfig,
  obtenerblacklist,
  obtenerwhitelist,
  actualizarblacklist,
  obtenerDatosInventarios,
  obtenerConfiguracion,
  obtenerMensajesManuales,
  registrarPedido,
  actualizarCelda,
  generartextokey,
  obtenerevento,
  generarmensajes,
  obtenerpostsolicitud,
  registrarsolicitudes,
  validanumero,
  agregargrupocontactos,
  recuperarcontactos,
  recuperargrupos
};
