from openai import AsyncOpenAI
from dotenv import load_dotenv
import logging
import os
import asyncio
import tiktoken

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, "llm_activity.log")

from utils.logger import logger

# Agregar handler de actividad LLM al logger centralizado
llm_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
llm_handler.setLevel(logging.INFO)
llm_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
llm_handler.setFormatter(llm_formatter)
logger.addHandler(llm_handler)

load_dotenv()

# Async client
client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY_PSICOUJA"),
    base_url=os.getenv("BASE_URL_MODELS_PSICOUJA")
)

MODEL_PSICOUJA = os.getenv("MODEL_PSICOUJA", "ALIA-psicouja_model")
MODEL_QWEN = os.getenv("MODEL_QWEN", "Qwen3.5-9B")
MODEL_GEMMA = os.getenv("MODEL_GEMMA", "gemma-4-E4B-it")

CURRENT_MODELS = [MODEL_PSICOUJA, MODEL_QWEN, MODEL_GEMMA]

# Límite de tokens para el contexto
MAX_TOKENS = 8192
# Reservar tokens para la respuesta del modelo
RESERVED_TOKENS = 256

def count_tokens(messages, model="gpt-3.5-turbo"):
    """
    Cuenta los tokens en una lista de mensajes.
    Usa tiktoken para estimar los tokens de forma precisa.
    """
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")
    
    num_tokens = 0
    for message in messages:
        num_tokens += 4
        for key, value in message.items():
            num_tokens += len(encoding.encode(str(value)))
    
    num_tokens += 2
    return num_tokens

def truncate_messages(messages, max_tokens=MAX_TOKENS - RESERVED_TOKENS):
    """
    Trunca el historial de mensajes eliminando los más antiguos hasta que
    el total de tokens esté por debajo del límite.
    """
    if not messages:
        return messages
    
    current_tokens = count_tokens(messages)
    
    if current_tokens <= max_tokens:
        # Se ha reducido el ruido de este log ya que es informativo pero frecuente
        # logger.debug(f"Messages within token limit: {current_tokens}/{max_tokens} tokens")
        return messages
    
    logger.warning(f"Messages exceed token limit: {current_tokens}/{max_tokens} tokens. Truncating...")
    
    system_message = messages[0] if messages[0].get("role") == "system" else None
    conversation_messages = messages[1:] if system_message else messages[:]
    
    if not conversation_messages:
        return messages
    
    truncated = [system_message] if system_message else []
    
    for i in range(len(conversation_messages) - 1, -1, -1):
        test_messages = [system_message] if system_message else []
        test_messages.extend(conversation_messages[i:])
        
        tokens = count_tokens(test_messages)
        
        if tokens <= max_tokens:
            truncated = test_messages
        else:
            break
    
    messages_removed = len(messages) - len(truncated)
    if messages_removed > 0:
        logger.info(f"Removed {messages_removed} old messages. New token count: {count_tokens(truncated)}")
    
    return truncated

def clean_messages(messages):
    """
    Normaliza la lista de mensajes combinando roles consecutivos repetidos.
    """
    if not messages:
        return []
    
    cleaned = []
    for msg in messages:
        if cleaned and cleaned[-1]['role'] == msg['role']:
            cleaned[-1]['content'] += f" {msg['content']}"
        else:
            cleaned.append(dict(msg))
    return cleaned


# async def _call_llama(messages):
#     """Llama al modelo Llama de forma asíncrona."""
#     url_prefix = os.getenv("URL_MODELS_PSICOUJA", "")
#     try:
#         logger.info("Calling Llama model...")
#         response = await client.chat.completions.create(
#             model=url_prefix + "meta-llama/Llama-3.1-8B-Instruct",
#             messages=messages,
#             max_tokens=256,
#             temperature=0.7
#         )
#         content = response.choices[0].message.content.strip()
#         logger.info("Llama call successful.")
#         return content
#     except Exception as ex:
#         logger.error(f"Error calling Llama: {ex}")
#         return str(ex)

async def _call_psicoujamodel(messages):
    """Llama al modelo PsicoujaModel de forma asíncrona."""
    url_prefix = os.getenv("URL_MODELS_PSICOUJA", "")
    try:
        logger.info("Calling PsicoujaModel...")
        response = await client.chat.completions.create(
            model=MODEL_PSICOUJA,
            messages=messages,
            max_tokens=256,
            temperature=0.7
        )
        content = response.choices[0].message.content.strip()
        logger.info("PsicoujaModel call successful.")
        return content
    except Exception as ex:
        logger.error(f"Error calling PsicoujaModel: {ex}")
        return str(ex)


async def _call_qwen(messages):
    """Llama al modelo Qwen de forma asíncrona."""
    url_prefix = os.getenv("URL_MODELS_PSICOUJA", "")
    try:
        logger.info("Calling Qwen model...")
        response = await client.chat.completions.create(
            model=MODEL_QWEN,
            messages=messages,
            max_tokens=256,
            temperature=0.7,
            extra_body={"chat_template_kwargs": {"enable_thinking": False}},
        )
        content = response.choices[0].message.content.strip()
        logger.info("Qwen call successful.")
        return content
    except Exception as ex:
        logger.error(f"Error calling Qwen: {ex}")
        return str(ex)


async def _call_gemma(messages):
    """Llama al modelo Gemma de forma asíncrona (requiere ajuste del rol system)."""
    url_prefix = os.getenv("URL_MODELS_PSICOUJA", "")
    # Gemma no soporta role 'system', se convierte a 'user'
    gemma_messages = []
    for msg in messages:
        if msg["role"] == "system":
            gemma_messages.append({"role": "user", "content": msg["content"]})
        else:
            gemma_messages.append(dict(msg))
    gemma_messages = clean_messages(gemma_messages)

    try:
        logger.info("Calling Gemma model...")
        response = await client.chat.completions.create(
            model=MODEL_GEMMA,
            messages=gemma_messages,
            max_tokens=256,
            temperature=0.7
        )
        content = response.choices[0].message.content.strip()
        logger.info("Gemma call successful.")
        return content
    except Exception as ex:
        logger.error(f"Error calling Gemma: {ex}")
        return str(ex)


def clean_response(text):
    """
    Limpia la respuesta del modelo eliminando prefijos comunes y texto no deseado.
    """
    if "Error code:" in text:
        return ""
    if not text:
        return ""
    
    prefixes_to_remove = [
        "Sugerencia de respuesta:",
        "Opción:",
        "Respuesta:",
        "1.", "2.", "3.",
        "Thinking:",
        "**Thinking**",
        "<thinking>",
        "</thinking>"
    ]
    
    cleaned = text.strip()
    
    for prefix in prefixes_to_remove:
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    
    # Remover bloques de thinking si existen
    if "<thinking>" in cleaned and "</thinking>" in cleaned:
        import re
        cleaned = re.sub(r'<thinking>.*?</thinking>', '', cleaned, flags=re.DOTALL)
    
    # Remover asteriscos de markdown
    cleaned = cleaned.replace("**", "").replace("*", "")
    
    # Remover saltos de línea excesivos
    cleaned = " ".join(cleaned.split())

    return cleaned.strip()


def _build_messages(chat_history, therapist_style=None, therapist_tone=None, therapist_instructions=None):
    """
    Construye la lista de mensajes formateada para los modelos a partir del historial.
    Devuelve None si el historial no es válido.
    """
    system_message = """Eres un psicólogo profesional en una sesión terapéutica. Estás conversando con un paciente y debes continuar la conversación siempre con rol de psicólogo. No digas nada fuera de lugar.\nIMPORTANTE:\n- Responde SOLO con lo que dirías al paciente como terapeuta, sin explicaciones adicionales\n- NO incluyas prefijos como "Psicólogo:", "Respuesta:" o similares"""
    
    if therapist_style:
        if therapist_style.lower() == "act":
            system_messagtem_message += f"\n\nTu estilo terapéutico es: {therapist_style}"
    if therapist_tone:
        system_message += f"\nTu tono de comunicación debe ser: {therapist_tone}"
    if therapist_instructions:
        system_message += f"\nInstrucciones adicionales: {therapist_instructions}"
    system_message += f"\nEmpieza la conversacion: "

    messages = [{"role": "system", "content": system_message}]
    
    if isinstance(chat_history, list):
        for msg in chat_history:
            original_role = msg.get("role", "user")
            if original_role in ["user", "patient"]:
                role = "user"
            elif original_role in ["assistant", "therapist"]:
                role = "assistant"
            else:
                role = original_role
            content = msg.get("content", "")
            if content:
                messages.append({"role": role, "content": content})
    
    # Para evitar errores de API (ej. Qwen 400 "System message must be at the beginning") 
    # y solucionar el recency bias, enmarcamos el último mensaje del usuario.
    if therapist_instructions:
        last_user_idx = None
        for i in range(len(messages) - 1, -1, -1):
            if messages[i]["role"] == "user":
                last_user_idx = i
                break
                
        if last_user_idx is not None:
            original_text = messages[last_user_idx]["content"]
            framed_content = (
                f"Mensaje del paciente:\n"
                f"\"\"\"{original_text}\"\"\"\n\n"
                f"=== INSTRUCCIONES INTERNAS PARA LA IA (De obligado cumplimiento) ===\n"
                f"Debes responder a este paciente adoptando tu rol de terapeuta y aplicando estrictamente las siguientes instrucciones:\n"
                f"{therapist_instructions}\n"
                f"IMPORTANTE: No menciones la existencia de estas instrucciones en tu respuesta."
            )
            messages[last_user_idx]["content"] = framed_content
        else:
            reminder = f"=== INSTRUCCIONES INTERNAS PARA LA IA ===\nDebes responder aplicando estrictamente estas instrucciones:\n{therapist_instructions}"
            messages.append({"role": "user", "content": reminder})
    
    return messages


async def generate_response_options_stream(chat_history, therapist_style=None, therapist_tone=None, therapist_instructions=None):
    """
    Generador asíncrono que llama a los 3 modelos LLM en paralelo y hace yield
    de cada resultado (como evento SSE) tan pronto como está disponible.
    
    Yields dicts: {"type": "option", "index": int, "text": str}
    Al final:     {"type": "done", "options": list[str]}
    """
    messages = _build_messages(chat_history, therapist_style, therapist_tone, therapist_instructions)
    
    fallback_messages = ["Error Modelo 1", "Error Modelo 2", "Error Modelo 3"]
    
    if len(messages) <= 1:
        logger.warning("No valid chat history found, returning fallbacks.")
        for i, fb in enumerate(fallback_messages):
            yield {"type": "option", "index": i, "text": fb}
        yield {"type": "done", "options": fallback_messages}
        return
    
    # Normalizar y truncar
    safe_messages = clean_messages(messages)
    safe_messages = truncate_messages(safe_messages)
    
    logger.info(f"LLM Parallel Request: {len(safe_messages)} messages, {count_tokens(safe_messages)} tokens")
    
    # Crear las 3 coroutines con su índice
    # Cola compartida: cada tarea mete (idx, resultado) cuando termina
    queue: asyncio.Queue = asyncio.Queue()

    async def _run_and_enqueue(idx: int, coro):
        try:
            result = await coro
        except Exception as ex:
            logger.error(f"Model {idx} raised exception: {ex}")
            result = ""
        await queue.put((idx, result))

    # Lanzar las 3 tareas en paralelo
    tasks = [
        asyncio.create_task(_run_and_enqueue(0, _call_psicoujamodel(safe_messages))),
        asyncio.create_task(_run_and_enqueue(1, _call_qwen(safe_messages))),
        asyncio.create_task(_run_and_enqueue(2, _call_gemma(safe_messages))),
    ]

    raw_results = {}

    # Recoger resultados en el orden en que llegan
    for _ in range(3):
        idx, raw_content = await queue.get()
        cleaned = clean_response(raw_content) if raw_content else ""
        raw_results[idx] = cleaned
        logger.info(f"Model {idx} completed. Streaming option...")
        yield {"type": "option", "index": idx, "text": cleaned}

    # Aseguramos que todas las tareas hayan terminado antes de continuar
    await asyncio.gather(*tasks, return_exceptions=True)

    # Construir lista final ordenada (índices 0, 1, 2)
    final_options = [raw_results.get(i, "") for i in range(3)]
    # Rellenar fallbacks si alguno quedó vacío
    for i, opt in enumerate(final_options):
        if not opt or len(opt) < 3:
            final_options[i] = fallback_messages[i]

    logger.info("--- PARALLEL LLM calls completed ---")
    yield {"type": "done", "options": final_options, "models_used": CURRENT_MODELS}


async def generate_response_options(chat_history, therapist_style=None, therapist_tone=None, therapist_instructions=None):
    """
    Versión no-streaming para compatibilidad. Llama a los 3 modelos en paralelo
    con asyncio.gather y retorna el resultado cuando todos han terminado.
    """
    messages = _build_messages(chat_history, therapist_style, therapist_tone, therapist_instructions)
    
    fallback_messages = ["Error Modelo 1", "Error Modelo 2", "Error Modelo 3"]
    
    if len(messages) <= 1:
        logger.warning("No valid chat history found, returning hardcoded fallbacks.")
        return {
            "options": fallback_messages,
            "raw_options": ""
        }
    
    safe_messages = clean_messages(messages)
    safe_messages = truncate_messages(safe_messages)
    
    logger.info(f"--- Starting PARALLEL LLM calls ({len(safe_messages)} messages, {count_tokens(safe_messages)} tokens) ---")
    
    try:
        # Llamadas paralelas con asyncio.gather
        content_model1, content_model2, content_model3 = await asyncio.gather(
            _call_psicoujamodel(safe_messages),
            _call_qwen(safe_messages),
            _call_gemma(safe_messages),
            return_exceptions=True
        )
        
        # Si alguno lanzó excepción, convertirlo en string
        raw_results = []
        for r in [content_model1, content_model2, content_model3]:
            if isinstance(r, Exception):
                raw_results.append(str(r))
            else:
                raw_results.append(r or "")
        
        options = []
        for content in raw_results:
            cleaned = clean_response(content)
            if cleaned and len(cleaned) > 2:
                options.append(cleaned)
        
        if len(options) < 3:
            logger.warning(f"Not enough LLM options ({len(options)}), adding fallbacks.")
            while len(options) < 3:
                options.append(fallback_messages[len(options)])
        
        logger.info("--- PARALLEL LLM calls completed ---")
        return {
            "options": options,
            "raw_options": "Output Model 1: " + str(raw_results[0]) + "\nOutput Model 2: " + str(raw_results[1]) + "\nOutput Model 3: " + str(raw_results[2]),
            "models_used": CURRENT_MODELS
        }

    except Exception as e:
        logger.error(f"Error in generate_response_options: {e}")
        return {
            "options": fallback_messages,
            "raw_options": str(e)
        }

async def generate_strategy_options(chat_history, previous_session_summary=None):
    """
    Generate quick strategic instruction pills using Gemma based on the conversation history.
    """
    system_instruction = (
        "Analiza el historial de esta conversación terapéutica. "
        "Como experto supervisor clínico, proporciona EXACTAMENTE 4 opciones de estrategias o instrucciones MUY BREVES (máximo 15 palabras cada una) "
        "que el psicólogo podría intentar en su siguiente respuesta.\n"
        "REGLA ESPECIAL: Si es el INICIO de la sesión y el paciente solo ha saludado, incluye SIEMPRE una opción estratégica para interesarse por su estado general, su día o cómo le ha ido desde la última vez.\n"
    )

    if previous_session_summary:
        system_instruction += f"\nRESUMEN DE LA SESIÓN ANTERIOR (Contexto importante):\n{previous_session_summary}\n"

    system_instruction += (
        "\nLas opciones deben ser variadas (ej. validar emociones, explorar pensamientos, confrontar amablemente, encuadrar).\n"
        "RESPONDE ÚNICAMENTE con una lista de viñetas, usando el símbolo '-'. "
        "NO incluyas introducciones, bienvenidas, ni despedidas. Ejemplo:\n"
        "- Validar la frustración del paciente ante la sobrecarga laboral.\n"
        "- Explorar qué pensamientos automáticos preceden a su ansiedad.\n"
        "- Resumir los puntos clave y preparar el cierre de la sesión.\n"
        "- Enfocar la atención en sus logros de esta semana."
    )

    # Re-use _build_messages logic but ignore therapist style/tone to get pure context
    messages = []
    messages.append({"role": "system", "content": system_instruction})
    
    if isinstance(chat_history, list):
        for msg in chat_history:
            original_role = msg.get("role", "user")
            # Map roles properly
            role = "user" if original_role in ["user", "patient"] else "assistant"
            content = msg.get("content", "")
            if content:
                messages.append({"role": role, "content": content})
                
    # To force Gemma to output the strategies, we append a final instruction message in user role
    # because Gemma handles instructions better in the user role.
    messages.append({
        "role": "user", 
        "content": "A partir de lo anterior, genera la lista de viñetas con las 4 estrategias. SOLO LA LISTA, NUNCA DES EXPLICACIONES."
    })
    
    safe_messages = clean_messages(messages)
    safe_messages = truncate_messages(safe_messages)
    
    logger.info(f"Generating strategies with Gemma... ({count_tokens(safe_messages)} tokens)")
    try:
        raw_output = await _call_gemma(safe_messages)
        # Parse bullet points
        strategies = []
        for line in raw_output.split('\n'):
            line = line.strip()
            if line.startswith('- ') or line.startswith('* '):
                # Remove the bullet
                strategy = line[2:].strip()
                if strategy:
                    strategies.append(strategy)
        
        # Fallback if parsing failed
        if not strategies:
            logger.warning(f"Failed to parse strategies from Gemma output. Raw: {raw_output}")
            strategies = [
                "👋 Saluda de forma cálida al paciente.",
                "🔍 Haz preguntas abiertas para explorar.",
                "🤝 Valida las emociones del paciente.",
                "🛑 Resume lo hablado para el cierre."
            ]
            
        return strategies[:4] # ensure max 4
    except Exception as e:
        logger.error(f"Error in generate_strategy_options: {e}")
        return [
            "👋 Saluda de forma cálida al paciente.",
            "🔍 Haz preguntas abiertas para explorar.",
            "🤝 Valida las emociones del paciente.",
            "🛑 Resume lo hablado para el cierre."
        ]


async def generate_ia_patient_response(chat_history, patient_personality_prompt=None):
    """
    Generate a response as a fictional patient using Gemma.
    The roles are inverted: therapist messages become 'user' and patient messages become 'assistant',
    so Gemma generates the next 'patient' utterance.
    """
    default_personality = (
        "Eres María, una paciente ficticia de 28 años que acude a terapia por problemas de ansiedad. "
        "Tu trasfondo y vida cotidiana:\n"
        "- Profesión: Diseñadora gráfica freelance. Trabajas desde casa, lo que aumenta tu aislamiento. "
        "Tienes un cliente especialmente exigente y caótico (un proyecto de identidad de marca para una cadena de cafés) "
        "que te envía correos a deshoras, lo que te dispara el síndrome del impostor y te hace procrastinar por miedo a no estar a la altura.\n"
        "- Vida personal: Vives sola con tu gata 'Mimi'. Tienes pareja (Pablo), pero apenas le cuentas cómo te sientes realmente "
        "porque temes ser una carga o que se canse de tus quejas.\n"
        "- Síntomas principales: Dificultad extrema para conciliar el sueño (te quedas rumiando hasta las 3 o 4 de la mañana), "
        "sensación de opresión en el pecho, respiración agitada y una constante preocupación catastrófica de que te vas a quedar sin clientes y acabarás en la ruina.\n"
        "- Comportamiento en terapia: Eres reflexiva e inteligente, pero muestras resistencia inconsciente. "
        "Te cuesta horrores llevar las pautas a la práctica. Si el terapeuta te propone una tarea, es muy probable que pongas excusas "
        "reales (ej. 'se me olvidó', 'me dio pereza', 'sentí que no me iba a servir' o 'me dio ansiedad solo de pensarlo'). "
        "Muestras ambivalencia: deseas mejorar pero te asusta el cambio o confrontar tus miedos."
    )

    personality = patient_personality_prompt.strip() if patient_personality_prompt and patient_personality_prompt.strip() else default_personality

    system_message = (
        "Actúa como la paciente descrita a continuación en una sesión de terapia por chat (mensajería de texto en tiempo real). "
        "Tu objetivo es comunicarte exactamente como lo haría una persona real en esta situación.\n\n"
        f"Tu identidad y trasfondo:\n{personality}\n\n"
        "REGLAS CRÍTICAS DE ESTILO Y REALISMO (DE OBLIGADO CUMPLIMIENTO):\n"
        "1. ESTILO DE MENSAJERÍA REALISTA:\n"
        "   - Escribe en minúsculas de forma casual y omite tildes de vez en cuando. Prefiere encadenar ideas cortas usando comas en lugar de terminar cada frase con un punto, para que suene más fluido y conversacional. NO abuses de los puntos suspensivos (...); úsalos solo de forma muy esporádica si realmente dudas de algo.\n"
        "   - Evita discursos largos, estructurados o perfectos. Escribe tus respuestas para ser enviadas en un único mensaje de chat (de 1 a 3 frases cortas). Evita parrafadas largas.\n"
        "   - No respondas a todos los puntos del terapeuta a la vez. Elige solo un aspecto, el que más te resuene, te asuste o te llame la atención, y céntrate en él, tal como ocurre en un chat real.\n"
        "   - NUNCA uses viñetas, listas numeradas, negritas de markdown, ni formateo artificial.\n"
        "   - Usa expresiones de vacilación y muletillas naturales en español al chatear: 'es que', 'no sé', 'bueno', 'a ver', 'en plan', 'la verdad'.\n"
        "2. COMPORTAMIENTO CLÍNICO Y ACTITUD:\n"
        "   - NUNCA hables usando términos clínicos de diagnóstico (no digas 'tengo ansiedad generalizada' o 'sufro de pensamientos catastrofistas'). Describe tus experiencias subjetivamente ('siento como que me ahogo', 'le doy mil vueltas a todo', 'pienso que me va a ir fatal').\n"
        "   - Muestra resistencia realista: no aceptes las soluciones del psicólogo de buenas a primeras. Duda de ellas o explica por qué te da miedo o pereza probarlas (ej. 'es que ya probé a respirar y no me hace nada', 'me cuesta mucho ponerme a hacer eso sola').\n"
        "   - Si el terapeuta te hace muchas preguntas seguidas, siéntete abrumada o responde solo a una de ellas con dudas.\n"
        "   - Reacciona de forma coherente al tono del terapeuta: si es demasiado frío o formal, sé más escueta o defensiva. Si es empático, ábrete un poco más, pero con reservas.\n"
        "3. LIMITACIONES TÉCNICAS ABSOLUTAS:\n"
        "   - Responde ÚNICAMENTE con el mensaje que enviarías en el chat. NUNCA escribas explicaciones fuera de personaje, ni acotaciones de tus pensamientos (ej. *suspiro* o *piensa que*), ni prefijos como 'Paciente:' o 'María:'.\n"
        "   - Responde en español de forma natural e informal."
    )

    # Build messages with INVERTED roles:
    # Therapist (assistant in original) -> user (so Gemma sees therapist as the one talking TO the patient)
    # Patient (user in original) -> assistant (so Gemma continues as the patient)
    messages = [{"role": "system", "content": system_message}]

    if isinstance(chat_history, list):
        for msg in chat_history:
            original_role = msg.get("role", "user")
            # In the original chat: user=patient, assistant=therapist
            # We invert: therapist messages -> user, patient messages -> assistant
            if original_role in ["assistant", "therapist"]:
                role = "user"  # Therapist talking to patient -> Gemma sees as input
            elif original_role in ["user", "patient"]:
                role = "assistant"  # Patient responses -> Gemma continues as patient
            else:
                role = original_role
            content = msg.get("content", "")
            if content:
                messages.append({"role": role, "content": content})

    safe_messages = clean_messages(messages)
    safe_messages = truncate_messages(safe_messages)

    logger.info(f"Generating IA patient response with Gemma ({count_tokens(safe_messages)} tokens)")

    try:
        raw_output = await _call_gemma(safe_messages)
        cleaned = clean_response(raw_output) if raw_output else ""

        if not cleaned or len(cleaned) < 3:
            cleaned = "No sé qué decir ahora mismo... necesito un momento para pensar."

        logger.info(f"IA Patient response generated: {cleaned[:100]}...")
        return cleaned
    except Exception as e:
        logger.error(f"Error in generate_ia_patient_response: {e}")
        return "Perdona, me he quedado en blanco... ¿puedes repetir?"

async def generate_session_summary(chat_history):
    """
    Generate an objective, brief summary of a session using Gemma based on the conversation history.
    """
    system_instruction = (
        "Analiza el historial de esta conversación terapéutica y genera un resumen esquemático, breve y objetivo. "
        "Escribe directamente el resumen, sin introducciones ni decoraciones. "
        "No utilices asteriscos (*) ni símbolos de formato markdown. "
        "Utiliza guiones (-) para los puntos clave. "
        "Céntrate exclusivamente en el contenido hablado con el paciente. "
        "No asumas, no analices, no des opiniones. Solo describe los hechos y temas tratados de forma clara."
    )

    messages = [{"role": "system", "content": system_instruction}]
    
    if isinstance(chat_history, list):
        for msg in chat_history:
            original_role = msg.get("role", "user")
            if original_role in ["user", "patient", "paciente"]:
                role = "user"
            elif original_role in ["assistant", "therapist", "psicologo"]:
                role = "assistant"
            else:
                role = original_role
            
            content = msg.get("content", msg.get("text", ""))
            if content:
                messages.append({"role": role, "content": content})
                
    messages.append({
        "role": "user", 
        "content": "A partir de lo anterior, genera el resumen objetivo y breve de la sesión."
    })
    
    safe_messages = clean_messages(messages)
    safe_messages = truncate_messages(safe_messages)
    
    logger.info(f"Generating session summary with Gemma... ({count_tokens(safe_messages)} tokens)")
    try:
        raw_output = await _call_gemma(safe_messages)
        # Limpieza básica preservando saltos de línea y viñetas para el resumen
        cleaned = raw_output.strip() if raw_output else ""
        if "<thinking>" in cleaned:
            import re
            cleaned = re.sub(r'<thinking>.*?</thinking>', '', cleaned, flags=re.DOTALL).strip()
            
        # Remover prefijos innecesarios que a veces añade el modelo
        for prefix in ["Resumen:", "Resumen de la sesión:", "- Resumen:"]:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()

        if not cleaned:
             return "No se pudo generar el resumen de la sesión."
        return cleaned
    except Exception as e:
        logger.error(f"Error in generate_session_summary: {e}")
        return "Error al generar el resumen de la sesión."

async def generate_bitacora_summary(session_title, session_notes, ai_summary):
    """
    Generates a brief summary for the clinical log (bitácora) combining the session title,
    therapist notes, and the AI generated summary.
    """
    system_instruction = (
        "Eres un asistente clínico experto. Tu tarea es generar una entrada breve para una bitácora clínica "
        "basándote en tres fuentes de información: el título de la sesión, las notas del terapeuta y un resumen generado por IA. "
        "Debes sintetizar esta información de forma MUY breve y profesional (máximo 4 líneas). "
        "No uses introducciones, ve directo al grano. No uses asteriscos ni formato markdown complejo."
    )

    prompt = (
        f"Título de la sesión: {session_title}\n"
        f"Notas del terapeuta: {session_notes}\n"
        f"Resumen IA previo: {ai_summary}\n\n"
        "Genera la entrada breve para la bitácora:"
    )

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": prompt}
    ]

    logger.info("Generating bitacora summary with Gemma...")
    try:
        raw_output = await _call_gemma(messages)
        # Limpieza básica
        cleaned = raw_output.strip() if raw_output else ""
        if "<thinking>" in cleaned:
            import re
            cleaned = re.sub(r'<thinking>.*?</thinking>', '', cleaned, flags=re.DOTALL).strip()
        
        if not cleaned:
            return "Sin detalles adicionales para la bitácora."
        return cleaned
    except Exception as e:
        logger.error(f"Error in generate_bitacora_summary: {e}")
        return "Error al generar la entrada de la bitácora."
