import { supabase } from '../lib/supabase';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const aiService = {
  async chat(messages: AIChatMessage[], userContext: any) {
    if (!API_KEY) {
      throw new Error('DEEPSEEK_API_KEY no configurada');
    }

    // System prompt para restringir datos y dar personalidad
    const systemPrompt: AIChatMessage = {
      role: 'system',
      content: `Eres el Asistente Inteligente de "A la Carrera ERP". 
      Tu objetivo es ayudar a ${userContext.role === 'admin' ? 'el Administrador' : 'el Vendedor ' + userContext.username}.
      
      REGLAS CRÍTICAS:
      1. NO reveles ingredientes detallados ni proporciones de las RECETAS (son propiedad intelectual). Puedes hablar de costos o nombres de productos.
      2. Si eres un vendedor, SOLO puedes dar información de TUS clientes (${userContext.username}).
      3. Mantén un tono profesional, eficiente y directo.
      
      CONTEXTO ACTUAL:
      - Usuario: ${userContext.username}
      - Rol: ${userContext.role}
      - Fecha: ${new Date().toLocaleDateString()}
      `
    };

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [systemPrompt, ...messages],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en la API de DeepSeek');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }
};
