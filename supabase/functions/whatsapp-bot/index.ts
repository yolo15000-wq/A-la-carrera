import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_TOKEN = "EAAP08xxChjcBRMWESIjap6mk8lZBFk51r5NTrYeVdAgDND7GeJ9RsHMDoNu7GeH6IH9tEU8w975buCWIIhPbsZC8FhgZByTJ1Sy5dgIrDXbyaHOqZA51OAShItzDirWL4Npkh8RLgk2XApZBNfSBA5Bu8r0ePFTPB4orhOQvYSjEP6rOZCKh8NRWo0UCGEGl9l8wZDZD";
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
      let queryProductos = supabase.from("productos").select("nombre, stock, precio");
      
      const fechaHoy = new Date().toISOString().split('T')[0];
      let queryPedidos = supabase.from("pedidos").select("cliente, producto, cantidad, estado").eq("fecha", fechaHoy);

      // Si es vendedor común, FILTRAMOS su cartera y pedidos
      if (esVendedor) {
        queryCartera = queryCartera.eq("vendedor", nombreUsuario);
        queryPedidos = queryPedidos.eq("vendedor", nombreUsuario);
      }

      const [{ data: inventario }, { data: cartera }, { data: productos }, { data: pedidos }] = await Promise.all([
        queryInventario,
        queryCartera,
        queryProductos,
        queryPedidos
      ]);

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
              - Materia Prima: ${JSON.stringify(inventario || [])}. 
              - Productos Terminados (Stock y Precios): ${JSON.stringify(productos || [])}.
              - Cartera bajo supervisión: ${JSON.stringify(cartera || [])}.
              - Pedidos registrados hoy: ${JSON.stringify(pedidos || [])}.
              
              REGLAS DE RESPUESTA:
              1. Saluda por nombre la primera vez.
              2. Responde de forma eficiente y clara (usa viñetas si es necesario). Emojis útiles: 📦, 🚚, 💰, ⚠️.
              3. Si es Admin: Puede ver TODO (insumos, productos, toda la cartera, todos los pedidos). Avísale si hay insumos con stock bajo (cercano a 0).
              4. Si es Vendedor: Ayúdalo a vender. Dile qué productos hay en stock y registra sus pedidos. Solo puede ver su cartera y sus pedidos de hoy.
              5. NO REVELES RECETAS.
              6. Si el usuario quiere registrar un pedido, USA LA FUNCION registrar_pedido. Confírmale de vuelta cuando se haya hecho. Usa los nombres de productos y clientes según lo pida.`
            },
            { role: "user", content: userText }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "registrar_pedido",
                description: "Registra un nuevo pedido preventa hecho por el vendedor.",
                parameters: {
                  type: "object",
                  properties: {
                    cliente: { type: "string", description: "Nombre del cliente" },
                    producto: { type: "string", description: "Nombre del producto a vender" },
                    cantidad: { type: "number", description: "Cantidad numérica" }
                  },
                  required: ["cliente", "producto", "cantidad"]
                }
              }
            }
          ]
        })
      });

      const aiData = await aiResponse.json();
      const messageData = aiData.choices?.[0]?.message;
      let replyText = messageData?.content || "Terminé el proceso.";

      // 4. Interceptar y ejecutar la función si DeepSeek decidió hacerla
      if (messageData?.tool_calls?.length > 0) {
        for (const toolCall of messageData.tool_calls) {
          if (toolCall.function.name === 'registrar_pedido') {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              console.log("Registrando pedido:", args);
              
              await supabase.from('pedidos').insert({
                fecha: fechaHoy,
                vendedor: nombreUsuario,
                cliente: args.cliente,
                producto: args.producto,
                cantidad: args.cantidad,
                estado: 'Pendiente'
              });

              replyText = `✅ ¡Pedido registrado con éxito, ${nombreUsuario}!\n\n📦 *Producto:* ${args.producto}\n🔢 *Cantidad:* ${args.cantidad}\n👤 *Cliente:* ${args.cliente}\n\n*Nota:* Saldrá como "Pendiente" hasta que el operario lo despache.`;
            } catch (err) {
              console.error("Error al registrar pedido:", err);
              replyText = `❌ Hubo un error al intentar registrar el pedido en la base de datos.`;
            }
          }
        }
      }

      // Si DeepSeek no devuelve texto y sí ejecutó función, pero está vacío
      if (!replyText || replyText.trim() === "Terminé el proceso.") {
        replyText = "¡Listo! Acción ejecutada.";
      }

      console.log("Enviando respuesta a WhatsApp...");

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
