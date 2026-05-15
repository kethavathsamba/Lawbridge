"""Comprehensive analysis of the transfer issue."""
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
    print("🔍 TRANSFER ISSUE ANALYSIS")
    print("=" * 70)
    
    CASE_ID = "69f1a0221a08b1cf265d3857"
    
    # Get case details
    case = db.cases.find_one({"_id": ObjectId(CASE_ID)})
    
    if not case:
        print("❌ Case not found")
        exit(1)
    
    print(f"\n📋 CASE CONFIGURATION:")
    print(f"  Case ID: {CASE_ID}")
    print(f"  Lawyer ID: {case.get('lawyerId')}")
    print(f"  Lawyer Wallet (on case): {case.get('lawyerWalletAddress')}")
    print(f"  Escrow Contract: {case.get('escrowContractAddress')}")
    
    # Get lawyer profile
    lawyer_id = case.get('lawyerId')
    if lawyer_id:
        lawyer = db.lawyers.find_one({"_id": ObjectId(lawyer_id)})
        if lawyer:
            print(f"\n📋 LAWYER PROFILE:")
            print(f"  Lawyer ID: {lawyer.get('_id')}")
            print(f"  Name: {lawyer.get('name')}")
            print(f"  Wallet (on profile): {lawyer.get('walletAddress')}")
            print(f"  Email: {lawyer.get('email')}")
    
    # Get escrow transactions
    print(f"\n📋 TRANSFER TRANSACTION RECORD:")
    escrow_txn = db.escrow_transactions.find_one(
        {"caseId": CASE_ID},
        sort=[("createdAt", -1)]
    )
    
    if escrow_txn:
        print(f"  TX Hash: {escrow_txn.get('txHash')}")
        print(f"  Status: {escrow_txn.get('status')}")
        print(f"  Amount: {escrow_txn.get('amount')}")
        print(f"  Type: {escrow_txn.get('type')}")
        print(f"  Lawyer Address Used: {escrow_txn.get('lawyerAddress')}")
        print(f"  Error: {escrow_txn.get('transferError')}")
    
    print(f"\n" + "=" * 70)
    print("✓ FINDINGS:")
    print("=" * 70)
    
    EXPECTED = "0xda0acc5c43c4f8c8ae8285fc99ae999a7a0e7396"
    WRONG_TX = "0x0965C44D37fC71cFFEF0Bd68E478b821481A8060"
    
    case_wallet = case.get('lawyerWalletAddress', '').lower()
    lawyer_wallet = lawyer.get('walletAddress', '').lower() if lawyer else ""
    
    print(f"\nExpected Lawyer: {EXPECTED}")
    print(f"Wrong TX went to: {WRONG_TX}")
    print(f"Case wallet: {case_wallet}")
    print(f"Lawyer profile wallet: {lawyer_wallet}")
    
    if case_wallet == EXPECTED.lower():
        print(f"\n⚠️  Case has CORRECT wallet configured")
    else:
        print(f"\n❌ Case wallet MISMATCH")
    
    if escrow_txn and escrow_txn.get('lawyerAddress'):
        used = escrow_txn.get('lawyerAddress', '').lower()
        if used == WRONG_TX.lower():
            print(f"\n❌ Transfer used WRONG address from database!")
            print(f"   Address in escrow_transactions: {used}")
        else:
            print(f"\n✓ Transfer address was: {used}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
