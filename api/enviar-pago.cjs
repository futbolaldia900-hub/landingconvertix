const https = require('https');
const crypto = require('crypto');

// --- Configuración de la API ---
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PIXEL_ID = '1946841772846486';
const META_API_URL = 'graph.facebook.com';
const META_API_VERSION = 'v18.0';

// Función para "hashear" (encriptar) el teléfono
function hashData(data) {
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

        if (!telefono || !monto || !telefono.startsWith('+')) {
            return response.status(400).json({ error: 'Datos inválidos. Se requiere teléfono (con +) y monto.' });
        }
        
        // 1. Construir los datos del evento (payload)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        const eventData = {
            event_name: 'Purchase',
            event_time: currentTimestamp,
            user_data: {
                ph: [hashData(telefono)], // Enviar el teléfono hasheado
            },
            custom_data: {
                value: monto,
                currency: 'ARS',
            },
            // Datos necesarios para la atribución
            event_source_url: 'https://landingconvertix.vercel.app',
            action_source: 'website',
        };
        
        const payload = JSON.stringify({
            data: [eventData],
            access_token: ACCESS_TOKEN // Usar el token directamente
        });

        // 2. Opciones de la petición HTTPs
        const options = {
            hostname: META_API_URL,
            port: 443,
            path: `/${META_API_VERSION}/${PIXEL_ID}/events`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length,
            },
        };

        // 3. Enviar la petición a Meta y esperar la respuesta
        const metaResponse = await new Promise((resolve, reject) => {
            const req = https.request(options, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ statusCode: res.statusCode, data }));
            });

            req.on('error', reject);
            req.write(payload);
            req.end();
        });

        const metaResult = JSON.parse(metaResponse.data);

        // 4. Verificar la respuesta de Meta
        if (metaResponse.statusCode !== 200 || metaResult.error) {
             console.error('Meta API Error:', metaResult);
             return response.status(500).json({ 
                 error: `Error de la API de Meta. Causa: ${metaResult.error_user_title || metaResult.error.message || 'Error de token/permiso.'}` 
             });
        }
        
        // Éxito: Enviar respuesta HTTP 200 al frontend
        response.status(200).json({ success: true, message: '¡Éxito! Conversión enviada a Meta.' });

    } catch (err) {
        // En caso de error general, como fallo de red
        console.error('Error FATAL del servidor:', err);
        response.status(500).json({ error: `Error del servidor: ${err.message}` });
    }
};
