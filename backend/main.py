from fastapi import HTTPException

from fastapi import FastAPI 
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from database import get_db
from models import Ticket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal
from ai_service import classify_ticket


class TicketCreate(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=10, max_length=1000)

class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    status: str
    created_at: datetime
    priority: str | None
    category: str | None
    ai_summary: str | None

    model_config={
        "from_attributes": True
    }
class TicketUpdate(BaseModel):
    status: Literal["new", "in_progress", "resolved"]



app = FastAPI(
    title="SignalDesk API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH","DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.get("/")
def root():
    return {
        "message": "SignalDesk API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "signaldesk-api"
    }

@app.post("/tickets", response_model=TicketResponse, status_code=201)
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db),):
    classification = classify_ticket(
    ticket.title,
    ticket.description
)
    db_ticket = Ticket(
        title = ticket.title,
        description = ticket.description,
        status = "new",
        priority = classification.priority,
        category = classification.category,
        ai_summary = classification.summary
    )
    db.add(db_ticket) # tell SQLAlchemy to add the new ticket to the database session
    db.commit() # commit the transaction to save the new ticket to the database
    db.refresh(db_ticket) # refresh the instance with the data from the database, including the generated ID and timestamps
    return db_ticket

@app.get("/tickets", response_model=list[TicketResponse])
def get_tickets(db: Session = Depends(get_db)):
    statement = select(Ticket)
    result = db.execute(statement)
    tickets = result.scalars().all()
    return tickets

@app.patch("/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket(ticket_id: int, ticket: TicketUpdate, db: Session = Depends(get_db)):
    db_ticket = db.get(Ticket, ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db_ticket.status = ticket.status
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.get(Ticket, ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db.delete(db_ticket)
    db.commit()
    return {"detail": "Ticket deleted successfully"}