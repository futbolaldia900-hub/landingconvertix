// Importar la librería (NUEVA FORMA DE IMPORTAR - LA DEFINITIVA)
import * as facebookNodejsBusinessSdk from 'facebook-nodejs-business-sdk';
import crypto from 'crypto'; // Librería de encriptación (ya viene con Vercel)

// Acceder a las clases desde el import
// Este `import *` soluciona el error 'Cannot destructure'
const { FacebookAdsApi, ServerEvent, UserData } = facebookNodejsBusinessSdk;

// --- Configuración de la API (Tus secretos) ---
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PIXEL_ID = '1946841772846486'; // Tu ID de Píxel

// Función para "hashear" (encriptar) los datos como pide Meta
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// --- El Cerebro de la API ---
export default async function handler(request, response) {

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método no permitido. Solo POST.' });
  }

  try {
    const { telefono, monto } = request.body;

    if (!telefono || !monto || !telefono.startsWith('+')) {
      return response.status(400).json({ error: 'Datos inválidos. Se requiere teléfono (con +) y monto.' });
    }

    // 3. Inicializar la API de Meta
    FacebookAdsApi.init(ACCESS_TOKEN);

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
        // Asegúrate que esta sea tu URL de Vercel
        .setEventSourceUrl('https://landingconvertix.vercel.app'); 

    // 6. Enviar el evento
    await FacebookAdsApi.sendEvent(PIXEL_ID, [serverEvent]);

    response.status(200).json({ success: true, message: 'Evento de compra enviado a Meta.' });

  } catch (err) {
    // En caso de error, responder al admin.html con el detalle
    console.error('Error al enviar evento a Meta:', err);
    response.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
}
