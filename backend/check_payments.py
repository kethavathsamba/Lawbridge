"""Check payments collection for transaction details."""
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/lawbridge")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client.lawbridge
    
    print("=" * 70)
    print("💰 PAYMENTS COLLECTION SEARCH")
    print("=" * 70)
    
    CASE_ID = "69f1a0221a08b1cf265d3857"
    
    # Search in payments collection
    payments = list(db.payments.find({"caseId": CASE_ID}).sort("createdAt", -1))
    
    print(f"\nFound {len(payments)} payment records for case {CASE_ID}:\n")
    
    for i, payment in enumerate(payments):
        print(f"[{i+1}] Payment Record:")
        print(f"    ID: {payment.get('_id')}")
        print(f"    Status: {payment.get('status')}")
        print(f"    Amount: {payment.get('amount') or payment.get('amountUSDC')}")
        print(f"    TX Hash: {payment.get('txHash', 'None')}")
        print(f"    Type: {payment.get('type', 'N/A')}")
        print(f"    Transfer Error: {payment.get('transferError', 'None')}")
        print(f"    Lawyer Address: {payment.get('lawyerAddress', 'None')}")
        print(f"    Created: {payment.get('createdAt')}")
        print()
    
    # Also check escrow_transactions
    print("=" * 70)
    print("🔗 ESCROW_TRANSACTIONS SEARCH")
    print("=" * 70)
    
    escrow_txns = list(db.escrow_transactions.find({"caseId": CASE_ID}).sort("createdAt", -1))
    
    print(f"\nFound {len(escrow_txns)} escrow transaction records:\n")
    
    for i, txn in enumerate(escrow_txns):
        print(f"[{i+1}] Escrow Transaction:")
        print(f"    Type: {txn.get('type')}")
        print(f"    Status: {txn.get('status')}")
        print(f"    Amount: {txn.get('amount')}")
        print(f"    TX Hash: {txn.get('txHash', 'None')}")
        print(f"    Lawyer: {txn.get('lawyerAddress', 'None')}")
        print(f"    Error: {txn.get('transferError', 'None')}")
        print(f"    Created: {txn.get('createdAt')}")
        print()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
