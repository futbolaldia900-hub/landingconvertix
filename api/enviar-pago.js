// Importar las librerías necesarias
import { FacebookAdsApi, ServerEvent, UserData } from 'facebook-business-sdk';
import crypto from 'crypto'; // Librería de encriptación (ya viene con Vercel)

// --- Configuración de la API (Tus secretos) ---
// Vercel inyecta automáticamente el token que guardamos en el Paso 2
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PIXEL_ID = '1946841772846486'; // Tu ID de Píxel

// Función para "hashear" (encriptar) los datos como pide Meta
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// --- El Cerebro de la API ---
export default async function handler(request, response) {

  // 1. Solo permitir que este endpoint reciba datos (POST)
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método no permitido. Solo POST.' });
  }

  try {
    // 2. Leer los datos (teléfono y monto) que envía admin.html
    const { telefono, monto } = request.body;

    // Validación simple de los datos
    if (!telefono || !monto || !telefono.startsWith('+')) {
      return response.status(400).json({ error: 'Datos inválidos. Se requiere teléfono (con +) y monto.' });
    }

    // 3. Inicializar la API de Meta con nuestro Token
    const api = FacebookAdsApi.init(ACCESS_TOKEN);

    // 4. Crear los datos del usuario (¡Hasheado!)
    // NO enviamos "+549...", enviamos el hash.
    const userData = new UserData()
        .setPhone(hashData(telefono)); // Hashear el teléfono

    // 5. Crear el evento de "Compra"
    const currentTimestamp = Math.floor(Date.now() / 1000); // Hora actual

    const serverEvent = new ServerEvent()
        .setEventName('Purchase')      // El nombre del evento: Compra
        .setEventTime(currentTimestamp) // Cuándo ocurrió
        .setUserData(userData)          // Quién lo hizo (el tel hasheado)
        .setCustomData({
            value: monto,               // Cuánto pagó
            currency: 'ARS',            // En qué moneda (Pesos Argentinos)
        })
        .setEventSourceUrl(`https://landingconvertix.vercel.app`); // URL de ejemplo (requerido)
        // IMPORTANTE: Pon tu dominio principal si lo tienes, sino, déjalo así.

    // 6. Enviar el evento a Meta
    await api.sendEvent(PIXEL_ID, [serverEvent]);

    // 7. Responder al admin.html con ¡Éxito!
    response.status(200).json({ success: true, message: 'Evento de compra enviado a Meta.' });

  } catch (err) {
    // En caso de error, responder al admin.html con el detalle
    console.error('Error al enviar evento a Meta:', err);
    response.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
}
