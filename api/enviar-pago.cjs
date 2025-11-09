// ESTE ES EL NUEVO CÓDIGO CON SINTAXIS 'require'

// Importar las librerías con la sintaxis 'require' (CommonJS)
const facebookNodejsBusinessSdk = require('facebook-nodejs-business-sdk');
const crypto = require('crypto');

// Acceder a las clases desde la librería
const { FacebookAdsApi, ServerEvent, UserData } = facebookNodejsBusinessSdk;

// --- Configuración de la API (Tus secretos) ---
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PIXEL_ID = '1946841772846486'; // Tu ID de Píxel

// Función para "hashear" (encriptar) los datos como pide Meta
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// --- El Cerebro de la API ---
// Usamos 'module.exports' en lugar de 'export default'
module.exports = async (request, response) => {

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
};
