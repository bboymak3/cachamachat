import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3-8b-instruct";

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// 1. API DEL CHAT (Cerebro)
		if (url.pathname === "/api/chat" && request.method === "POST") {
			return handleChatRequest(request, env as any);
		}

		// 2. SIRVE EL HTML (Diseño Visual) DIRECTAMENTE
		// Si entras a la web, te muestra el diseño Dorado
		if (url.pathname === "/") {
			return new Response(html, {
				headers: { "Content-Type": "text/html;charset=UTF-8" },
			});
		}

		// 3. FOTOS (Si las tienes subidas)
		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;

/**
 * LÓGICA DEL CEREBRO
 */
async function handleChatRequest(request: Request, env: any): Promise<Response> {
	try {
		const { messages = [] } = (await request.json()) as { messages: ChatMessage[]; };
		const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";

		// Buscar en Base de Datos
		let menuContext = "";
		try {
			const { results } = await env.DB.prepare(
				"SELECT * FROM menu_items WHERE nombre LIKE ? OR categoria LIKE ? OR descripcion LIKE ? LIMIT 5"
			).bind(`%${lastUserMsg}%`, `%${lastUserMsg}%`, `%${lastUserMsg}%`).all();

			if (results && results.length > 0) {
				menuContext = JSON.stringify(results);
			} else {
				const { results: random } = await env.DB.prepare("SELECT * FROM menu_items LIMIT 3").all();
				menuContext = "Sugerencias: " + JSON.stringify(random);
			}
		} catch (e) {
			menuContext = "Error DB";
		}

		const SYSTEM_PROMPT = `
		Eres el anfitrión de "La Cachamita de Oro" en Barinas.
		TU MISION: Vender comida llanera.
		TONO: Muy amable, criollo pero educado.
		
		DATOS DEL MENÚ: ${menuContext}

		INSTRUCCIONES:
		1. Saludo: "¡Epa! Bienvenido a La Cachamita de Oro 🐟. ¿Busca Desayuno o Almuerzo?".
		2. Da precios exactos.
		3. Muestra fotos así: ![foto](https://cachamachat.estilosgrado33.workers.dev/fotos/ID.png)
		`;

		const aiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages.filter((m) => m.role !== "system")];

		const stream = await env.AI.run(MODEL_ID, {
			messages: aiMessages,
			max_tokens: 1024,
			stream: true,
		});

		return new Response(stream, { headers: { "content-type": "text/event-stream" } });

	} catch (error) {
		return new Response(JSON.stringify({ error: "Error" }), { status: 500 });
	}
}

/**
 * DISEÑO VISUAL (HTML + CSS + JAVASCRIPT DE LIMPIEZA)
 * Aquí es donde cambiamos el color a Dorado y arreglamos el texto raro.
 */
const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>La Cachamita de Oro</title>
    <style>
        /* --- TEMA DORADO / LLANERO --- */
        :root {
            --primary: #FFC107;      /* Amarillo Maíz / Dorado */
            --primary-dark: #FF8F00; /* Naranja Tostado */
            --bg-color: #FFFDF5;     /* Crema muy suave */
            --chat-user: #FFF9C4;    /* Amarillo pálido (Usuario) */
            --chat-bot: #FFFFFF;     /* Blanco (Bot) */
            --text-main: #3E2723;    /* Marrón Café (Texto) */
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            color: var(--text-main);
        }

        /* CABECERA DORADA */
        header {
            background: linear-gradient(to right, var(--primary), var(--primary-dark));
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            color: #3E2723; /* Texto marrón para contraste */
        }
        
        .logo { font-size: 24px; background: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .title h1 { margin: 0; font-size: 18px; font-weight: 800; }
        .title p { margin: 0; font-size: 12px; font-weight: 500; opacity: 0.8; }

        /* CHAT */
        #chat-box {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .msg {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 12px;
            line-height: 1.5;
            font-size: 15px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .bot { 
            align-self: flex-start; 
            background: var(--chat-bot); 
            border-left: 5px solid var(--primary); /* Borde dorado a la izquierda */
            border-top-left-radius: 2px;
        }
        
        .user { 
            align-self: flex-end; 
            background: var(--chat-user); 
            border-top-right-radius: 2px;
        }

        .bot img { max-width: 100%; border-radius: 8px; margin-top: 10px; border: 2px solid #eee; }

        /* AREA DE ESCRIBIR */
        form {
            background: white;
            padding: 10px 15px;
            display: flex;
            gap: 10px;
            border-top: 1px solid #eee;
        }
        input {
            flex: 1;
            padding: 12px;
            border: 2px solid #EEE;
            border-radius: 25px;
            outline: none;
            font-size: 16px;
        }
        input:focus { border-color: var(--primary); }
        
        button {
            background: var(--primary-dark);
            color: white;
            border: none;
            width: 45px; height: 45px;
            border-radius: 50%;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        button svg { width: 20px; height: 20px; fill: white; }

        /* ESTADO ESCRIBIENDO */
        .status { font-size: 12px; color: #888; margin-left: 20px; display: none; margin-bottom: 5px; }
    </style>
</head>
<body>

    <header>
        <div class="logo">🐟</div>
        <div class="title">
            <h1>La Cachamita de Oro</h1>
            <p>Sabor Llanero Auténtico</p>
        </div>
    </header>

    <div id="chat-box">
        <div class="msg bot">
            ¡Epa camarita! 🤠 Bienvenido al mejor sabor de Barinas. <br><br>
            ¿Qué le provoca hoy? ¿Un buen <b>Desayuno</b> o nuestros <b>Almuerzos Criollos</b>?
        </div>
    </div>
    <div class="status" id="status">Cocinando respuesta...</div>

    <form id="form">
        <input type="text" id="input" placeholder="Pide tu plato aquí..." required autocomplete="off">
        <button type="submit">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
    </form>

    <script>
        const form = document.getElementById('form');
        const box = document.getElementById('chat-box');
        const inp = document.getElementById('input');
        const status = document.getElementById('status');
        let hist = [];

        form.onsubmit = async (e) => {
            e.preventDefault();
            const txt = inp.value.trim();
            if(!txt) return;

            // Mostrar mensaje usuario
            inp.value = '';
            addMsg(txt, 'user');
            hist.push({role: "user", content: txt});
            status.style.display = 'block';

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({messages: hist})
                });

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";
                let botDiv = null;
                let first = true;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // AQUI ESTA LA MAGIA: Limpiamos el texto crudo
                    const chunk = decoder.decode(value, {stream: true});
                    
                    // Separamos por líneas (cada "data: ...")
                    const lines = chunk.split('\\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.replace('data: ', '').trim();
                            if (jsonStr === '[DONE]') break;
                            
                            try {
                                const data = JSON.parse(jsonStr);
                                if (data.response) {
                                    if(first) {
                                        status.style.display = 'none';
                                        botDiv = addMsg("", 'bot');
                                        first = false;
                                    }
                                    fullText += data.response;
                                    botDiv.innerHTML = formatText(fullText);
                                    box.scrollTop = box.scrollHeight;
                                }
                            } catch (e) {
                                // Ignorar errores de parseo en chunks cortados
                            }
                        }
                    }
                }
                hist.push({role: "assistant", content: fullText});
            } catch (err) {
                status.style.display = 'none';
                addMsg("Ups, falló la conexión.", 'bot');
            }
        };

        function addMsg(html, role) {
            const d = document.createElement('div');
            d.className = 'msg ' + role;
            d.innerHTML = formatText(html);
            box.appendChild(d);
            box.scrollTop = box.scrollHeight;
            return d;
        }

        function formatText(txt) {
            // Convierte ![alt](url) a imagen y saltos de línea
            return txt.replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1">').replace(/\\n/g, '<br>');
        }
    </script>
</body>
</html>
`;
