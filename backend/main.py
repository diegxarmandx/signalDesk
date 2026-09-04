from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI(
    title="SignalDesk API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
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