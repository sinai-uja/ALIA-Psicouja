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

PROMPTS_CACHE = {}

def load_prompt(filename):
    """
    Carga un prompt desde el archivo .md en la carpeta backend/prompts de forma cacheada.
    """
    if filename not in PROMPTS_CACHE:
        path = os.path.join(BASE_DIR, "prompts", filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                PROMPTS_CACHE[filename] = f.read().strip()
        except Exception as e:
            logger.error(f"Error loading prompt {filename}: {e}")
            return ""
    return PROMPTS_CACHE[filename]

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
    system_message = load_prompt("therapist_system.md")
    
    if therapist_style:
        if therapist_style.lower() == "act":
            system_message += f"\n\nTu estilo terapéutico es: {therapist_style}"
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
            framed_tmpl = load_prompt("therapist_instructions_framed.md")
            framed_content = framed_tmpl.format(
                original_text=original_text,
                therapist_instructions=therapist_instructions
            )
            messages[last_user_idx]["content"] = framed_content
        else:
            reminder_tmpl = load_prompt("therapist_instructions_reminder.md")
            reminder = reminder_tmpl.format(
                therapist_instructions=therapist_instructions
            )
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
    system_instruction = load_prompt("strategies_system.md")

    if previous_session_summary:
        system_instruction += f"\nRESUMEN DE LA SESIÓN ANTERIOR (Contexto importante):\n{previous_session_summary}\n"

    system_instruction += "\n" + load_prompt("strategies_instructions.md")

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
        "content": load_prompt("strategies_user_prompt.md")
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
    if patient_personality_prompt and patient_personality_prompt.strip():
        personality = patient_personality_prompt.strip()
    else:
        personality = load_prompt("patient_default_personality.md")

    system_message = load_prompt("patient_system.md").format(personality=personality)

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
    system_instruction = load_prompt("session_summary_system.md")

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
        "content": load_prompt("session_summary_user_prompt.md")
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
    system_instruction = load_prompt("bitacora_system.md")

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

async def generate_questionnaire_with_ai(user_prompt: str) -> dict:
    """
    Genera un cuestionario psicológico en formato JSON a partir del prompt de un usuario.
    """
    import json
    import re

    logger.info(f"Generating questionnaire for prompt: {user_prompt}")
    
    # Cargar prompt template
    prompt_tmpl = load_prompt("generate_questionnaire.md")
    system_content = prompt_tmpl.replace("{user_prompt}", user_prompt)
    
    # Messages
    messages = [
        {"role": "user", "content": system_content}
    ]
    
    try:
        logger.info("Calling Qwen model for questionnaire generation...")
        response = await client.chat.completions.create(
            model=MODEL_QWEN,
            messages=messages,
            max_tokens=1500,
            temperature=0.5,
            extra_body={"chat_template_kwargs": {"enable_thinking": False}}
        )
        content = response.choices[0].message.content.strip()
        logger.info("Qwen call for questionnaire successful.")
        
        # Limpieza básica para extraer el bloque JSON
        if "<thinking>" in content and "</thinking>" in content:
            content = re.sub(r'<thinking>.*?</thinking>', '', content, flags=re.DOTALL).strip()
            
        # Buscar bloques de código ```json ... ``` o ``` ... ```
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            first_brace = content.find('{')
            last_brace = content.rfind('}')
            if first_brace != -1 and last_brace != -1:
                json_str = content[first_brace:last_brace+1]
            else:
                json_str = content
                
        # Parsear JSON
        data = json.loads(json_str)
        return data
        
    except Exception as e:
        logger.error(f"Error in generate_questionnaire_with_ai: {e}")
        return {
            "title": "Cuestionario no generado",
            "description": "Hubo un error al intentar generar el cuestionario con IA.",
            "icon": "FileQuestion",
            "questions": [
                {
                    "id": "q1",
                    "text": f"Error: {str(e)}",
                    "type": "openText"
                }
            ]
        }

