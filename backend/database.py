"""MongoDB connection and database access."""
import os
from typing import Optional

import certifi
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

_client: Optional[MongoClient] = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        # Atlas requires TLS. On Windows, explicitly using certifi's CA bundle
        # avoids a bunch of "SSL handshake failed / WinError 10054" scenarios.
        #
        # For local dev against a non-TLS MongoDB, `mongodb://localhost:27017`
        # continues to work (tls options are ignored by the server).
        tls_insecure = os.getenv("MONGODB_TLS_INSECURE", "").strip().lower() in {"1", "true", "yes"}
        _client = MongoClient(
            uri,
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=tls_insecure,
            serverSelectionTimeoutMS=int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "30000")),
            connectTimeoutMS=int(os.getenv("MONGODB_CONNECT_TIMEOUT_MS", "20000")),
            socketTimeoutMS=int(os.getenv("MONGODB_SOCKET_TIMEOUT_MS", "20000")),
            retryWrites=True,
        )
    return _client


def get_db() -> Database:
    name = os.getenv("DATABASE_NAME", "lawbridge")
    return get_client()[name]


def get_collection(name: str):
    try:
        return get_db()[name]
    except PyMongoError as e:
        # Let callers decide how to render the error (typically HTTP 503).
        raise e
