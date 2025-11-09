// CÓDIGO FINAL Y ESTABLE PARA SERVERLESS DE VERCEL (CAPI)

// 1. Importar la librería de forma directa
const bizSdk = require('facebook-nodejs-business-sdk');
const crypto = require('crypto');

// 2. Acceder a las clases de Meta (Asignación directa para evitar errores de importación)
const FacebookAdsApi = bizSdk.FacebookAdsApi;
const ServerEvent = bizSdk.ServerEvent;
const UserData = bizSdk.UserData;

// --- Configuración de la API ---
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PIXEL_ID = '1946841772846486'; // Tu ID de Píxel

// Función para "hashear" (encriptar) el teléfono
function hashData(data) {
  // Aseguramos que quitamos el '+' antes de hashear el teléfono.
  let cleanedData = data.startsWith('+') ? data.substring(1) : data;
  return crypto.createHash('sha256').update(cleanedData).digest('hex');
}

// --- El Cerebro de la API ---
module.exports = async (request, response) => {

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método no permitido. Solo POST.' });
  }

  try {
    const { telefono, monto } = request.body;

    // Validación: El teléfono debe empezar con '+'
    if (!telefono || !monto || !telefono.startsWith('+')) {
      return response.status(400).json({ error: 'Datos inválidos. Se requiere teléfono (con +) y monto.' });
    }

    // 3. Inicializar la API de Meta
    FacebookAdsApi.init(ACCESS_TOKEN);

    // 4. Crear los datos del usuario (¡Hasheado!)
    const userData = new UserData()
        .setPhone(hashData(telefono)); 

    const currentTimestamp = Math.floor(Date.now() / 1000);

    const serverEvent = new ServerEvent()
        .setEventName('Purchase')
        .setEventTime(currentTimestamp)
        .setUserData(userData)
        .setCustomData({
            value: monto,
            currency: 'ARS',
        })
        // Tu URL de Vercel
        .setEventSourceUrl('https://landingconvertix.vercel.app'); 

    // 6. Enviar el evento
    await FacebookAdsApi.sendEvent(PIXEL_ID, [serverEvent]);

    // Éxito: Enviar respuesta HTTP 200 y el JSON que el frontend espera
    response.status(200).json({ success: true, message: '¡Éxito! Conversión enviada a Meta.' });

  } catch (err) {
    // Si hay un error, lo registramos en Vercel Logs y enviamos el detalle
    console.error('Error FATAL al enviar evento a Meta:', err);
    response.status(500).json({ error: `Error del servidor: La conexión con Meta falló. Causa: ${err.message}` });
  }
};
