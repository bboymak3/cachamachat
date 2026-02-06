/**
 * LA CACHAMITA DE ORO - CHATBOT INTELLIGENT WORKER
 */
import { Env, ChatMessage } from "./types";

// Modelo de IA optimizado
const MODEL_ID = "@cf/meta/llama-3-8b-instruct";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// 1. RUTA API: Maneja la inteligencia y la base de datos
		if (url.pathname === "/api/chat" && request.method === "POST") {
			return handleChatRequest(request, env as any);
		}

		// 2. RUTA PRINCIPAL: Sirve la nueva interfaz gráfica (HTML)
		// Si es la raíz "/", devolvemos el HTML moderno directamente
		if (url.pathname === "/") {
			return new Response(html, {
				headers: { "Content-Type": "text/html;charset=UTF-8" },
			});
		}

		// 3. ARCHIVOS ESTÁTICOS: Para fotos u otros recursos en /public
		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;

/**
 * LÓGICA DEL CEREBRO (IA + D1)
 */
async function handleChatRequest(request: Request, env: any): Promise<Response> {
	try {
		const { messages = [] } = (await request.json()) as {
			messages: ChatMessage[];
		};

		const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";

		// --- PASO A: BUSCAR EN LA BASE DE DATOS (D1) ---
		let menuContext = "";
		try {
			const { results } = await env.DB.prepare(
				"SELECT * FROM menu_items WHERE nombre LIKE ? OR categoria LIKE ? OR descripcion LIKE ? LIMIT 5"
			).bind(`%${lastUserMsg}%`, `%${lastUserMsg}%`, `%${lastUserMsg}%`).all();

			if (results && results.length > 0) {
				menuContext = "INFORMACIÓN DEL MENÚ ENCONTRADA: " + JSON.stringify(results);
			} else {
				// Si no hay búsqueda específica, traer sugerencias generales
				const { results: random } = await env.DB.prepare("SELECT * FROM menu_items LIMIT 3").all();
				menuContext = "No hay coincidencia exacta. Sugerencias generales: " + JSON.stringify(random);
			}
		} catch (e) {
			console.error("Error DB:", e);
			menuContext = "Error de conexión a precios. Ofrece el menú general.";
		}

		// --- PASO B: PERSONALIDAD DEL BOT ---
		const SYSTEM_PROMPT = `
		Eres el asistente virtual oficial de "La Cachamita de Oro" en Barinas, Venezuela.
		
		TU PERSONALIDAD:
		- Tono: Profesional, cálido, acogedor y educado.
		- Saludo: "¡Bienvenido a La Cachamita de Oro! 🐟 Es un gusto recibirle."
		- Estilo: Servicial y directo para tomar pedidos. NO uses jergas antiguas como "camarita".
		
		DATOS REALES DEL MENÚ (Precios y Descripciones):
		${menuContext}

		INSTRUCCIONES CLAVE:
		1. Si el usuario saluda, ofrece ver "Desayunos" o "Almuerzos Criollos".
		2. Si das un precio, sé exacto según la base de datos.
		3. AL RECOMENDAR UN PLATO, SIEMPRE INCLUYE LA FOTO ASÍ AL FINAL:
		   ![foto](https://cachamachat.estilosgrado33.workers.dev/fotos/ID.png)
		   (Reemplaza 'ID' por el id del plato que viene en la base de datos, ej: 01, 20).
		`;

		const aiMessages = [
			{ role: "system", content: SYSTEM_PROMPT },
			...messages.filter((m) => m.role !== "system"),
		];

		const stream = await env.AI.run(MODEL_ID, {
			messages: aiMessages,
			max_tokens: 1024,
			stream: true,
		});

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
	}
}

/**
 * INTERFAZ GRÁFICA MODERNA (HTML/CSS/JS)
 */
const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>La Cachamita de Oro</title>
    <style>
        /* RESET & BASICS */
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #e5ddd5; /* Fondo clásico de apps de chat */
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overscroll-behavior: none;
        }

        /* HEADER */
        header {
            background-color: #008069; /* Verde Oscuro Profesional */
            color: white;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            z-index: 10;
        }
        .avatar {
            width: 40px; height: 40px;
            background: white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 24px;
        }
        .info h1 { margin: 0; font-size: 16px; font-weight: 600; }
        .info p { margin: 0; font-size: 12px; opacity: 0.8; }

        /* CHAT AREA */
        #chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            background-image: linear-gradient(#e5ddd5 2px, transparent 2px), linear-gradient(90deg, #e5ddd5 2px, transparent 2px);
            background-size: 20px 20px;
            background-color: #efe7dd;
        }

        /* MENSAJES */
        .message {
            max-width: 80%;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 15px;
            line-height: 1.4;
            position: relative;
            box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        .bot {
            align-self: flex-start;
            background: white;
            border-top-left-radius: 0;
            color: #111;
        }
        .user {
            align-self: flex-end;
            background: #d9fdd3; /* Verde claro usuario */
            border-top-right-radius: 0;
            color: #111;
        }
        
        /* FOTOS EN EL CHAT */
        .bot img {
            max-width: 100%;
            border-radius: 6px;
            margin-top: 8px;
            display: block;
        }

        /* INPUT AREA */
        form {
            background: #f0f2f5;
            padding: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-top: 1px solid #ddd;
        }
        input {
            flex: 1;
            padding: 12px 15px;
            border: none;
            border-radius: 20px;
            background: white;
            font-size: 15px;
            outline: none;
        }
        button {
            background: #008069;
            color: white;
            border: none;
            width: 40px; height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        button svg { fill: white; width: 20px; height: 20px; margin-left: 2px; }

        /* LOADING DOTS */
        .typing { font-style: italic; color: #888; font-size: 12px; margin-left: 10px; display: none; }
    </style>
</head>
<body>
    <header>
        <div class="avatar">🐟</div>
        <div class="info">
            <h1>La Cachamita de Oro</h1>
            <p>En línea | Barinas</p>
        </div>
    </header>

    <div id="chat-container">
        <div class="message bot">
            ¡Hola! 👋 Es un gusto saludarle. <br><br>
            Bienvenido a <b>La Cachamita de Oro</b>. ¿Le gustaría ver nuestro menú de <b>Desayunos</b> o prefiere los <b>Almuerzos Criollos</b>?
        </div>
    </div>
    <div class="typing" id="typing-indicator">Escribiendo...</div>

    <form id="chat-form">
        <input type="text" id="msg-input" placeholder="Escribe un mensaje..." required autocomplete="off">
        <button type="submit">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
    </form>

    <script>
        const form = document.getElementById('chat-form');
        const container = document.getElementById('chat-container');
        const input = document.getElementById('msg-input');
        const typing = document.getElementById('typing-indicator');
        let history = [];

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if(!text) return;
            
            input.value = '';
            addMessage(text, 'user');
            history.push({role: "user", content: text});
            
            typing.style.display = 'block'; // Mostrar indicador

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({messages: history})
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let botMessage = "";
                let botDiv = null;
                let firstChunk = true;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    if(firstChunk) {
                        typing.style.display = 'none'; // Ocultar indicador
                        botDiv = addMessage("", 'bot');
                        firstChunk = false;
                    }

                    const chunk = decoder.decode(value, {stream: true});
                    botMessage += chunk;
                    botDiv.innerHTML = parseMarkdown(botMessage);
                    container.scrollTop = container.scrollHeight;
                }
                history.push({role: "assistant", content: botMessage});
            } catch (err) {
                typing.style.display = 'none';
                addMessage("Disculpe, hubo un error de conexión.", 'bot');
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
            // Convierte imágenes y saltos de línea
            let html = text.replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1">');
            return html.replace(/\\n/g, '<br>');
        }
    </script>
</body>
</html>
`;
