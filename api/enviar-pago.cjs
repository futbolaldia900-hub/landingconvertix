// ESTE CÓDIGO USA LA SINTAXIS MÁS ESTABLE PARA VERCEL
// Es más explícito para evitar fallos de importación.

// 1. Importar las librerías con la sintaxis 'require' (CommonJS)
const bizSdk = require('facebook-nodejs-business-sdk');
const crypto = require('crypto');

// 2. Acceder a las clases de Meta (Directamente desde la variable bizSdk)
const { FacebookAdsApi, ServerEvent, UserData } = bizSdk;

// --- Configuración de la API (Tus secretos) ---
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PIXEL_ID = '1946841772846486'; // Tu ID de Píxel

// Función para "hashear" (encriptar) los datos como pide Meta
function hashData(data) {
  // Nota: Meta requiere que el teléfono se envíe sin el '+'
  let cleanedData = data.startsWith('+') ? data.substring(1) : data;
  return crypto.createHash('sha256').update(cleanedData).digest('hex');
}

// --- El Cerebro de la API ---
// Usamos 'module.exports' para exportar la función.
module.exports = async (request, response) => {

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método no permitido. Solo POST.' });
  }

  try {
    const { telefono, monto } = request.body;

    // Validación: El teléfono debe empezar con '+' para asegurar formato internacional
    if (!telefono || !monto || !telefono.startsWith('+')) {
      return response.status(400).json({ error: 'Datos inválidos. Se requiere teléfono (con +) y monto.' });
    }

    // 3. Inicializar la API de Meta
    // Si el token fuera el problema, fallaría aquí.
    FacebookAdsApi.init(ACCESS_TOKEN);

    // 4. Crear los datos del usuario (¡Hasheado!)
    const userData = new UserData()
        .setPhone(hashData(telefono)); // La función hashData quita el '+' antes de hashear

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
    // Si la conexión fallara aquí, veríamos un error 500
    await FacebookAdsApi.sendEvent(PIXEL_ID, [serverEvent]);

    response.status(200).json({ success: true, message: 'Evento de compra enviado a Meta.' });

  } catch (err) {
    // Si hay un error, lo registramos en Vercel Logs y enviamos el detalle al formulario
    console.error('Error al enviar evento a Meta:', err);
    response.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
};
