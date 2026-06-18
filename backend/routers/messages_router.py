from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from typing import List

from pydantic import BaseModel
from database import get_session
from models import Message, MessageCreate, MessageRead, Psychologist
from utils.state import set_typing
from auth import get_current_user, get_current_actor, verify_patient_access
from logging_utils import log_action
from services.firebase_service import send_push_to_patient, send_new_message_notification
from utils.logger import logger

router = APIRouter()

async def run_safety_analysis(message_id: int):
    from database import engine
    from models import Message
    from llm_service import analyze_message_safety
    
    with Session(engine) as session:
        db_message = session.get(Message, message_id)
        if not db_message or not db_message.is_from_patient:
            return
        
        try:
            logger.info(f"Running safety analysis for message {message_id}...")
            safety_res = await analyze_message_safety(db_message.content)
            db_message.safety_status = safety_res.get("safety_status", "safe")
            db_message.safety_explanation = safety_res.get("safety_explanation", "")
            db_message.safety_keywords = safety_res.get("safety_keywords")
            session.add(db_message)
            session.commit()
            logger.success(f"Safety analysis completed for message {message_id}: {db_message.safety_status} (Keywords: {db_message.safety_keywords})")
        except Exception as e:
            logger.error(f"Error running safety analysis for message {message_id}: {e}")

@router.post("", response_model=MessageRead)
def create_message(
    message: MessageCreate, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session), 
    current_user = Depends(get_current_actor)
):
    # 1. Identificación segura del "Actor" para el log
    # Si es psicólogo usa .name, si es paciente usa .patient_code
    actor_name = getattr(current_user, "name", getattr(current_user, "patient_code", "Unknown"))
    actor_type = "psychologist" if hasattr(current_user, "role") else "patient"

    # 2. Verificar acceso y determinar psych_id
    patient_id = message.patient_id
    psych_id = None
    
    if actor_type == "psychologist":
        verify_patient_access(patient_id, current_user, session)
        psych_id = current_user.id
    else:
        if current_user.id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if current_user.psychologist_id:
            psych_id = current_user.psychologist_id

    # 3. Crear el mensaje con los campos de trazabilidad de IA
    db_message = Message(
        content=message.content,
        patient_id=message.patient_id,
        is_from_patient=message.is_from_patient,
        psychologist_id=psych_id,
        # Registramos si vino de una IA
        ai_suggestion_log_id=message.ai_suggestion_log_id,
        used_ai_suggestion=True if message.selected_option is not None else False,
        was_edited_by_human=message.was_edited_by_human,
    )
    
    session.add(db_message)
    session.commit()
    session.refresh(db_message)

    if db_message.is_from_patient:
        background_tasks.add_task(run_safety_analysis, db_message.id)

    # 4. (Opcional) Vincular el Log de IA con el mensaje final
    if message.ai_suggestion_log_id:
        from models import AISuggestionLog
        ai_log = session.get(AISuggestionLog, message.ai_suggestion_log_id)
        if ai_log:
            ai_log.final_option_id = message.selected_option
            session.add(ai_log)
            session.commit()
    

    log_action(
        session, 
        current_user.id, 
        actor_type, 
        actor_name, 
        "CREATE_MESSAGE", 
        details={
            "patient_id": message.patient_id, 
            "is_from_patient": message.is_from_patient,
            "ai_used": message.selected_option is not None
        }
    )
    

    # Notify patient if message is from psychologist
    if not message.is_from_patient:
        try:
            # Get psychologist name for better notification
            psych_name = "Tu psicólogo"
            if hasattr(current_user, "name"):
                psych_name = current_user.name
                
            from services.firebase_service import send_new_message_notification
            result = send_new_message_notification(
                patient_id=message.patient_id,
                message_id=db_message.id,
                sender_name=psych_name
            )
            logger.info(f"Sent notification to patient {message.patient_id} for message {db_message.id}. Result count: {result}")
        except Exception as e:
            logger.error(f"Error sending notification: {e}")

    return db_message

@router.get("/{patient_id}", response_model=List[MessageRead])
def get_messages(
    patient_id: int, 
    session: Session = Depends(get_session), 
    current_user = Depends(get_current_actor)
):
    query = select(Message).where(Message.patient_id == patient_id)

    if hasattr(current_user, "role"): # Psychologist
        verify_patient_access(patient_id, current_user, session)
        query = query.where(Message.psychologist_id == current_user.id)
    else: # Patient
        if current_user.id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if current_user.psychologist_id:
             query = query.where(Message.psychologist_id == current_user.psychologist_id)
        else:
             query = query.where(Message.psychologist_id == None) 

    statement = query.order_by(Message.created_at)
    return session.exec(statement).all()

@router.post("/mark-read/{patient_id}")
def mark_messages_read(
    patient_id: int, 
    session: Session = Depends(get_session), 
    current_user: Psychologist = Depends(get_current_user)
):
    verify_patient_access(patient_id, current_user, session)
    statement = select(Message).where(
        Message.patient_id == patient_id,
        Message.is_from_patient == True,
        Message.read == False
    )
    messages = session.exec(statement).all()
    
    for msg in messages:
        msg.read = True
        session.add(msg)
        
    session.commit()
    
    log_action(
        session, current_user.id, "psychologist", current_user.name, 
        "MARK_MESSAGES_READ", 
        details={"patient_id": patient_id, "count": len(messages)}
    )
    
    return {"ok": True, "count": len(messages)}

@router.delete("/{patient_id}")
def delete_messages(
    patient_id: int, 
    session: Session = Depends(get_session), 
    current_user: Psychologist = Depends(get_current_user)
):
    verify_patient_access(patient_id, current_user, session)
    statement = select(Message).where(Message.patient_id == patient_id)
    results = session.exec(statement)
    for message in results:
        session.delete(message)
    session.commit()
    
    log_action(
        session, current_user.id, "psychologist", current_user.name, 
        "DELETE_MESSAGES", 
        details={"patient_id": patient_id}
    )
    
    return {"ok": True, "deleted": True}

class TypingRequest(BaseModel):
    patient_id: int
    is_typing: bool

@router.post("/typing")
def update_typing_status(
    req: TypingRequest,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_actor)
):
    actor_type = "psychologist" if hasattr(current_user, "role") else "patient"
    if actor_type == "patient":
        if current_user.id != req.patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
        set_typing(f"patient_{req.patient_id}", req.is_typing)
    else:
        verify_patient_access(req.patient_id, current_user, session)
        set_typing(f"psychologist_{req.patient_id}", req.is_typing)
    return {"ok": True}

from utils.state import get_typing

@router.get("/{patient_id}/typing")
def get_typing_status(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_actor)
):
    actor_type = "psychologist" if hasattr(current_user, "role") else "patient"
    if actor_type == "patient":
        if current_user.id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        verify_patient_access(patient_id, current_user, session)
        
    return {
        "psychologist_is_typing": get_typing(f"psychologist_{patient_id}"),
        "patient_is_typing": get_typing(f"patient_{patient_id}")
    }