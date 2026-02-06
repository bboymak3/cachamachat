/**
 * LA CACHAMITA DE ORO - CHATBOT INTELLIGENT WORKER
 */
import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3-8b-instruct";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/chat" && request.method === "POST") {
			return handleChatRequest(request, env as any);
		}

		if (url.pathname === "/") {
			return new Response(html, {
				headers: { "Content-Type": "text/html;charset=UTF-8" },
			});
		}

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

		let menuContext = "";
		try {
			const { results } = await env.DB.prepare(
				"SELECT * FROM menu_items WHERE nombre LIKE ? OR categoria LIKE ? OR descripcion LIKE ? LIMIT 5"
			).bind(`%${lastUserMsg}%`, `%${lastUserMsg}%`, `%${lastUserMsg}%`).all();

			if (results && results.length > 0) {
				menuContext = "INFORMACIÓN DEL MENÚ: " + JSON.stringify(results);
			} else {
				const { results: random } = await env.DB.prepare("SELECT * FROM menu_items LIMIT 3").all();
				menuContext = "Sugerencias generales: " + JSON.stringify(random);
			}
		} catch (e) {
			menuContext = "Error de conexión. Ofrece el menú general.";
		}

		const SYSTEM_PROMPT = `
		Eres el anfitrión de "La Cachamita de Oro" en Barinas.
		TONO: Elegante, cálido y servicial.
		OBJETIVO: Vender comida llanera de calidad.
		
		DATOS DEL MENÚ: ${menuContext}

		INSTRUCCIONES:
		1. Saludo: "¡Bienvenido a La Cachamita de Oro! 🐟 El sabor auténtico de Barinas. ¿Desea ver nuestros Desayunos o los Almuerzos Criollos?".
		2. Precios exactos según la base de datos.
		3. AL RECOMENDAR UN PLATO, PON LA FOTO ASÍ AL FINAL:
		   ![foto](https://cachamachat.estilosgrado33.workers.dev/fotos/ID.png)
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
			headers: { "content-type": "text/event-stream; charset=utf-8" },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
	}
}

/**
 * INTERFAZ GRÁFICA "GOLD EDITION" (HTML/CSS)
 */
const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>La Cachamita de Oro</title>
    <style>
        /* COLORES Y FUENTES */
        :root {
            --primary-gold: #D4AF37; /* Dorado Clásico */
            --primary-dark: #B48811; /* Dorado Oscuro */
            --bg-cream: #FFFBF0;     /* Crema suave */
            --text-dark: #3E2723;    /* Marrón Café */
            --user-bubble: #FFE082;  /* Amarillo suave */
        }

        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-cream);
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            color: var(--text-dark);
        }

        /* HEADER */
        header {
            background: linear-gradient(135deg, var(--primary-gold), var(--primary-dark));
            color: white;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
            border-bottom-left-radius: 20px;
            border-bottom-right-radius: 20px;
        }
        .logo-circle {
            background: white;
            color: var(--primary-dark);
            width: 45px; height: 45px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 24px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header-info h1 { margin: 0; font-size: 1.1rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .header-info p { margin: 0; font-size: 0.8rem; opacity: 0.9; }

        /* CHAT AREA */
        #chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        /* MENSAJES */
        .message {
            max-width: 85%;
            padding: 15px;
            border-radius: 15px;
            font-size: 0.95rem;
            line-height: 1.5;
            position: relative;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .bot {
            align-self: flex-start;
            background: white;
            border-top-left-radius: 0;
            border-left: 4px solid var(--primary-gold); /* Detalle elegante */
        }

        .user {
            align-self: flex-end;
            background: var(--user-bubble);
            border-top-right-radius: 0;
            color: #333;
        }
        
        .bot img {
            max-width: 100%;
            border-radius: 10px;
            margin-top: 10px;
            box-shadow: 0 3px 6px rgba(0,0,0,0.1);
            border: 2px solid #fff;
        }

        /* INPUT AREA */
        form {
            background: white;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
        }

        input {
            flex: 1;
            padding: 15px;
            border: 2px solid #EEE;
            border-radius: 25px;
            background: #FAFAFA;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.3s;
        }
        input:focus { border-color: var(--primary-gold); background: white; }

        button {
            background: var(--primary-gold);
            color: white;
            border: none;
            width: 50px; height: 50px;
            border-radius: 50%;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 10px rgba(212, 175, 55, 0.4);
            transition: transform 0.2s;
        }
        button:active { transform: scale(0.95); }
        button svg { width: 22px; height: 22px; fill: white; margin-left: 3px; }

        /* LOADING */
        .typing { font-size: 12px; color: #999; margin-left: 20px; margin-bottom: 5px; display: none; }
    </style>
</head>
<body>
    <header>
        <div class="logo-circle">🐟</div>
        <div class="header-info">
            <h1>La Cachamita de Oro</h1>
            <p>Sabor llanero auténtico</p>
        </div>
    </header>

    <div id="chat-container">
        <div class="message bot">
            ¡Hola! 👋 Bienvenido a <b>La Cachamita de Oro</b>.<br><br>
            Hoy tenemos la mejor sazón de Barinas lista para usted. ¿Le gustaría ver el menú de <b>Desayunos</b> o prefiere los <b>Almuerzos</b>? 🍛
        </div>
    </div>
    <div class="typing" id="typing-indicator">El mesero está escribiendo...</div>

    <form id="chat-form">
        <input type="text" id="msg-input" placeholder="Pregunta por un plato..." required autocomplete="off">
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
            typing.style.display = 'block';

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
                        typing.style.display = 'none';
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
                addMessage("Disculpe, verifique su conexión.", 'bot');
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
            let html = text.replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1">');
            return html.replace(/\\n/g, '<br>');
        }
    </script>
</body>
</html>
`;