import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ message: "Faltan datos (teléfono o monto)" });
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  try {
    // Convertir teléfono y hashearlo (como Meta pide)
    const hashedPhone = crypto
      .createHash("sha256")
      .update(phone.trim().replace(/\s+/g, ""))
      .digest("hex");

    // Armar payload para Meta
    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: `manual_${Date.now()}`,
          user_data: {
            ph: [hashedPhone],
          },
          custom_data: {
            currency: "ARS", // ✅ Pesos Argentinos
            value: parseFloat(amount), // Ej: 26000
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
