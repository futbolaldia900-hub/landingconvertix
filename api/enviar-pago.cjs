const bizSdk = require('facebook-nodejs-business-sdk');
const crypto = require('crypto');
const FacebookAdsApi = bizSdk.FacebookAdsApi;
const ServerEvent = bizSdk.ServerEvent;
const UserData = bizSdk.UserData;

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PIXEL_ID = '1946841772846486';
function hashData(data) {
  let cleanedData = data.startsWith('+') ? data.substring(1) : data;
  return crypto.createHash('sha256').update(cleanedData).digest('hex');
}

module.exports = async (request, response) => {

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método no permitido. Solo POST.' });
  }

  try {
    const { telefono, monto } = request.body;

    if (!telefono || !monto || !telefono.startsWith('+')) {
      return response.status(400).json({ error: 'Datos inválidos. Se requiere teléfono (con +) y monto.' });
    }

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
      
        .setEventSourceUrl('https://landingconvertix.vercel.app'); 

    await FacebookAdsApi.sendEvent(PIXEL_ID, [serverEvent]);

    response.status(200).json({ success: true, message: 'Evento de compra enviado a Meta.' });

  } catch (err) {
    console.error('Error FATAL al enviar evento a Meta:', err);
    response.status(500).json({ error: `Error del servidor: La conexión con Meta falló. Causa: ${err.message}` });
  }
};
