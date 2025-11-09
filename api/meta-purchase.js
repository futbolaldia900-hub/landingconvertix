// /api/meta-purchase.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { phone, email, amount, event_id } = req.body;

  if (!amount || (!phone && !email)) {
    return res.status(400).json({ message: "Faltan datos (teléfono o monto)" });
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  try {
    const hashedPhone = phone
      ? crypto.createHash("sha256").update(phone.trim()).digest("hex")
      : null;
    const hashedEmail = email
      ? crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
      : null;

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: event_id || `manual_${Date.now()}`,
          user_data: {
            ph: hashedPhone ? [hashedPhone] : [],
            em: hashedEmail ? [hashedEmail] : [],
          },
          custom_data: {
            currency: "ARS", // 👈 Ahora en pesos argentinos
            value: parseFloat(amount), // Meta entiende el número como 26000 ARS
          },
          action_source: "website",
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    return res.status(200).json({ success: true, metaResponse: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
