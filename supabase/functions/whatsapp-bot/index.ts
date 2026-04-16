import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_TOKEN = "EAAP08xxChjcBRK6dt66Pf3A35mYAhBlOqhxBuUPweoAvql4UkWvkZCkZBOorrTWT9aTm3mlyz5kGCALMZAsgV80Yr8QhQtUmh0iPJFbUT1GftNF77vCB6gzuZCAOicl0mBICRn3gKzClpH2GYIPwZACFPBeJgZAf5dRk0EdElgfwLZBzFtKO0OgZBsPdSQvFHU12c0px1qz4ZCuUruTIBbYwCbfhy0G3BVlhHpZAb5QxMQ9B6rN92EZATVa5zutBlQEEr0k7QiWh3xj6n2okiJma0OIxBhDygZDZD";
const PHONE_NUMBER_ID = "1030875010117685";
const DEEPSEEK_API_KEY = "sk-e330ae8bb98a44a6be8af89f6a388417";
const VERIFY_TOKEN = "alacarrera_bot_verify_2026";

serve(async (req) => {
  // 1. Verificación del Webhook (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // 2. Procesamiento de Mensajes (POST)
  try {
    const body = await req.json();
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const from = message?.from; // Número del remitente

    if (message?.type === "text") {
      const userText = message.text.body;

      // Obtener datos de la base de datos para darle contexto a la IA
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // 1. Identificar quién habla (Solo Personal Autorizado en la tabla 'profiles')
      // Buscamos el número que coincida con la columna 'whatsapp'
      const { data: perfilStaff, error: errStaff } = await supabase
        .from("profiles")
        .select("username, role, whatsapp")
        .filter("whatsapp", "ilike", `%${from.slice(-10)}%`)
        .maybeSingle();

      // SI NO ES STAFF AUTORIZADO, NO HACEMOS NADA (Seguridad)
      if (!perfilStaff) {
        console.log(`Intento de acceso no autorizado desde: ${from}`);
        return new Response("Unauthorized", { status: 200 }); // Retornamos 200 para que Meta no reintente
      }

      const nombreUsuario = perfilStaff.username;
      const esAdmin = perfilStaff.role === "admin";
      const esVendedor = perfilStaff.role === "vendedor";

      // 2. Obtener datos según su rol
      let queryInventario = supabase.from("inventario").select("insumo, existencia, unidad");
      let queryCartera = supabase.from("cartera").select("cliente, monto_deuda, estado").eq("estado", "Pendiente");

      // Si es vendedor común, FILTRAMOS su cartera para que solo vea lo suyo
      if (esVendedor) {
        queryCartera = queryCartera.eq("vendedor", nombreUsuario);
      }

      const { data: inventario } = await queryInventario;
      const { data: cartera } = await queryCartera;

      console.log(`Mensaje de staff: ${nombreUsuario} (Role: ${perfilStaff.role}). Enviando a AI...`);

      // 3. Llamada a DeepSeek
      const aiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { 
              role: "system", 
              content: `Eres el cerebro de "A la Carrera ERP". 
              Estás hablando con el ${perfilStaff.role}: ${nombreUsuario}. 
              
              CONTEXTO:
              Inventario: ${JSON.stringify(inventario || [])}. 
              Cartera bajo supervisión: ${JSON.stringify(cartera || [])}.
              
              REGLAS DE RESPUESTA:
              1. Saluda por nombre: "Hola ${nombreUsuario}!"
              2. Responde de forma muy eficiente y con listas (bolitas). Emojis: 🐷, 🚚, 💰.
              3. Si es Admin: Puede ver todo.
              4. Si es Vendedor: Solo puede ver su cartera asignada.
              5. NO REVELES RECETAS (son secreto industrial).`
            },
            { role: "user", content: userText }
          ]
        })
      });

      const aiData = await aiResponse.json();
      const replyText = aiData.choices?.[0]?.message?.content || "Lo siento, tuve un problema al procesar tu mensaje.";

      console.log("Respuesta de AI obtenida. Enviando a WhatsApp...");

      // Enviar respuesta a WhatsApp (v25.0)
      const whatsappResp = await fetch(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: replyText }
        })
      });
      const whData = await whatsappResp.json();
      console.log("Resultado WhatsApp:", whData);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error crítico en la función:", error);
    return new Response("Error", { status: 500 });
  }
});
