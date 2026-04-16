import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "EAAP08xxChjcBRMWESIjap6mk8lZBFk51r5NTrYeVdAgDND7GeJ9RsHMDoNu7GeH6IH9tEU8w975buCWIIhPbsZC8FhgZByTJ1Sy5dgIrDXbyaHOqZA51OAShItzDirWL4Npkh8RLgk2XApZBNfSBA5Bu8r0ePFTPB4orhOQvYSjEP6rOZCKh8NRWo0UCGEGl9l8wZDZD";
const PHONE_NUMBER_ID = "1030875010117685";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const fechaHoy = new Date().toISOString().split('T')[0];

    // Obtener todos los pedidos de hoy
    const { data: pedidos } = await supabase.from("pedidos").select("vendedor, cliente, producto, cantidad, estado").eq("fecha", fechaHoy);
    
    // Obtener los vendedores con su whatsapp
    const { data: vendedores } = await supabase.from("profiles").select("username, whatsapp").in("role", ["admin", "vendedor"]).not("whatsapp", "is", null);

    if (!vendedores || vendedores.length === 0) return new Response("No target users", { status: 200 });

    for (const vendedor of vendedores) {
      // Filtrar pedidos del vendedor
      const pedidosVendedor = pedidos?.filter(p => p.vendedor === vendedor.username) || [];
      
      let message = `🌅 *¡Buenos días, ${vendedor.username}!* 🌅\n\nAquí tienes el resumen de tus pedidos para HOY (${fechaHoy}):\n\n`;
      
      if (pedidosVendedor.length === 0) {
        message += "📌 No tienes pedidos registrados para hoy.\n¡Mucho éxito en tus ventas! 🚀";
      } else {
        pedidosVendedor.forEach(p => {
          message += `📦 ${p.cantidad}x ${p.producto} (👤 ${p.cliente})\n`;
        });
        message += "\n*Sigue así. ¡Vamos con toda el día de hoy!* 💪🚚";
      }

      // Enviar a WhatsApp
      if (vendedor.whatsapp) {
        const to = vendedor.whatsapp;
        await fetch(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${WHATSAPP_TOKEN}`
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: { body: message }
          })
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Reminders sent" }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error enviando recordatorios:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
