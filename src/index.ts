import { Ai } from '@cloudflare/ai';

export interface Env {
  AI: any;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // --- 1. BACKEND: Manejo de la IA y Base de Datos ---
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { messages } = await request.json();
        const lastMsg = messages[messages.length - 1].content.toLowerCase();

        // Consulta a la Base de Datos D1
        let menuInfo = "No se pudo acceder al menú específico.";
        try {
          const { results } = await env.DB.prepare(
            "SELECT * FROM menu_items WHERE nombre LIKE ? OR categoria LIKE ? OR descripcion LIKE ? LIMIT 5"
          ).bind(`%${lastMsg}%`, `%${lastMsg}%`, `%${lastMsg}%`).all();
          
          if (results && results.length > 0) {
            menuInfo = JSON.stringify(results);
          } else {
             // Si no encuentra nada específico, busca platos generales para no dejar vacío
             const { results: general } = await env.DB.prepare("SELECT * FROM menu_items LIMIT 3").all();
             menuInfo = "No encontré ese plato exacto, pero tenemos: " + JSON.stringify(general);
          }
        } catch (e) {
          console.error("Error DB:", e);
        }

        // Configuración del Cerebro (System Prompt)
        const ai = new Ai(env.AI);
        const systemPrompt = `Eres el asistente virtual de "La Cachamita de Oro" en Barinas.
        TU OBJETIVO: Vender comida llanera.
        PERSONALIDAD: Amable, llanero ("Epa", "Camarita"), servicial.
        INSTRUCCIONES:
        1. Si saludan, ofrece: "¿Desea ver los Desayunos o los Almuerzos?".
        2. Usa la información del MENÚ ABAJO para dar precios y detalles.
        3. Si mencionas un plato, incluye su foto así: 
           ![foto](https://cachamachat.estilosgrado33.workers.dev/fotos/ID.png)
           (Reemplaza ID por el id del plato que viene en la base de datos).
        
        MENÚ DISPONIBLE AHORA: ${menuInfo}`;

        const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          stream: true,
        });

        return new Response(response, { headers: { 'Content-Type': 'text/event-stream' } });
      } catch (err) {
        return new Response("Error en el servidor: " + err, { status: 500 });
      }
    }

    // --- 2. FRONTEND: Servir el HTML del Chat ---
    // Si la ruta no es /api/chat, devolvemos la página web
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  },
};

// --- EL CÓDIGO HTML DEL CHAT (INTERFAZ) ---
const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>La Cachamita de Oro</title>
    <style>
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f0f2f5;margin:0;display:flex;flex-direction:column;height:100vh}
        header{background:#2e7d32;color:#fff;padding:15px;text-align:center;font-weight:bold;border-bottom:4px solid #fdd835}
        #chat-container{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px}
        .message{max-width:85%;padding:10px 15px;border-radius:15px;line-height:1.4;word-wrap:break-word}
        .user{align-self:flex-end;background:#2e7d32;color:#fff;border-bottom-right-radius:2px}
        .bot{align-self:flex-start;background:#fff;border:1px solid #e1e1e1;border-bottom-left-radius:2px}
        .bot img{max-width:100%;border-radius:10px;margin-top:10px;display:block}
        form{background:#fff;padding:10px;display:flex;gap:10px;border-top:1px solid #ddd}
        input{flex:1;padding:12px;border:1px solid #ccc;border-radius:20px;outline:none}
        button{background:#2e7d32;color:#fff;border:none;padding:10px 20px;border-radius:20px;font-weight:bold;cursor:pointer}
    </style>
</head>
<body>
    <header>🐟 La Cachamita de Oro</header>
    <div id="chat-container">
        <div class="message bot">¡Epa camarita! 🤠 Bienvenido al sabor de Barinas. <br>¿Qué le provoca hoy? ¿Unos <b>Desayunos</b> o nuestros <b>Almuerzos Criollos</b>?</div>
    </div>
    <form id="chat-form">
        <input type="text" id="msg-input" placeholder="Escribe tu pedido..." required autocomplete="off">
        <button type="submit">Enviar</button>
    </form>
    <script>
        const form = document.getElementById('chat-form');
        const container = document.getElementById('chat-container');
        const input = document.getElementById('msg-input');
        let history = [];

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if(!text) return;
            
            // Mostrar mensaje usuario
            input.value = '';
            addMessage(text, 'user');
            history.push({role: "user", content: text});

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({messages: history})
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let botMessage = "";
                let botDiv = addMessage("...", 'bot'); // Placeholder

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, {stream: true});
                    botMessage += chunk;
                    // Renderizar Markdown básico (imágenes y saltos de línea)
                    botDiv.innerHTML = parseMarkdown(botMessage);
                    container.scrollTop = container.scrollHeight;
                }
                history.push({role: "assistant", content: botMessage});
            } catch (err) {
                addMessage("Ups, se nos cayó el internet. Intenta de nuevo.", 'bot');
            }
        });

        function addMessage(text, sender) {
            const div = document.createElement('div');
            div.className = \`message \${sender}\`;
            div.innerHTML = parseMarkdown(text);
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
            return div;
        }

        function parseMarkdown(text) {
            // Convierte ![alt](url) a <img src="url">
            let html = text.replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1">');
            // Convierte saltos de línea
            return html.replace(/\\n/g, '<br>');
        }
    </script>
</body>
</html>
`;
