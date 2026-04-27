"""LawBridge API - FastAPI + MongoDB."""
import os
from dotenv import load_dotenv
load_dotenv()

import json
from starlette.requests import Request

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from bson import ObjectId

from routers import (
    auth,
    lawyers,
    cases,
    consultations,
    admin,
    legalhub,
    clients,
    notes,
    calendar,
    documents,
    messages,
    billing,
    notifications,
    support,
    payments,
)

app = FastAPI(title="LawBridge API", version="1.0.0")

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(lawyers.router)
app.include_router(cases.router)
app.include_router(consultations.router)
app.include_router(admin.router)
app.include_router(legalhub.router)
app.include_router(clients.router)
app.include_router(notes.router)
app.include_router(calendar.router)
app.include_router(documents.router)
app.include_router(messages.router)
app.include_router(billing.router)
app.include_router(notifications.router)
app.include_router(support.router)
app.include_router(payments.router)

@app.middleware("http")
async def custom_json_encoder_middleware(request: Request, call_next):
    response = await call_next(request)
    if response.status_code == 200 and response.media_type == "application/json":
        response.body = json.dumps(json.loads(response.body), cls=CustomJSONEncoder).encode("utf-8")
    return response

@app.get("/")
def root():
    return {"message": "LawBridge API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
