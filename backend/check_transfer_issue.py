"""Quick diagnostic to identify why funds aren't transferring to lawyer."""
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/lawbridge")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client.lawbridge
    
    print("=" * 60)
    print("🔍 TRANSFER DIAGNOSTIC")
    print("=" * 60)
    
    # Find a case with payment
    case = db.cases.find_one({}, sort=[("createdAt", -1)])
    
    if not case:
        print("❌ No cases found in database")
        exit(1)
    
    case_id = str(case.get("_id"))
    print(f"\n📋 Latest Case: {case_id}")
    print(f"   Lawyer ID: {case.get('lawyerId')}")
    
    # Check required fields
    lawyer_wallet = case.get("lawyerWalletAddress")
    escrow_contract = case.get("escrowContractAddress")
    
    print(f"\n✓ Condition 1: BLOCKCHAIN_PRIVATE_KEY")
    key = os.getenv("BLOCKCHAIN_PRIVATE_KEY")
    print(f"   Status: {'✅ SET' if key else '❌ NOT SET'} ({len(key) if key else 0} chars)")
    
    print(f"\n✓ Condition 2: Lawyer Wallet Address")
    if lawyer_wallet:
        print(f"   Status: ✅ SET")
        print(f"   Value: {lawyer_wallet}")
    else:
        print(f"   Status: ❌ NOT SET - BLOCKING TRANSFER")
    
    print(f"\n✓ Condition 3: Escrow Contract Address")
    if escrow_contract:
        print(f"   Status: ✅ SET")
        print(f"   Value: {escrow_contract}")
    else:
        print(f"   Status: ❌ NOT SET - BLOCKING TRANSFER")
    
    # Check payments for this case
    print(f"\n💰 Payment Status:")
    payment = db.payments.find_one({"caseId": case_id}, sort=[("createdAt", -1)])
    if payment:
        print(f"   Status: {payment.get('status')}")
        print(f"   Amount: {payment.get('amountUSDC')}")
        print(f"   TX: {payment.get('txHash', 'N/A')}")
    else:
        print(f"   Status: ❌ No payment record")
    
    # Check escrow transactions
    print(f"\n🔗 Escrow Transactions:")
    txns = list(db.escrow_transactions.find({"caseId": case_id}).sort("createdAt", -1).limit(3))
    if txns:
        for i, txn in enumerate(txns):
            print(f"   [{i+1}] {txn.get('type')}: {txn.get('status')}")
            if txn.get('txHash'):
                print(f"       TX: {txn.get('txHash')}")
    else:
        print(f"   No escrow transactions")
    
    print("\n" + "=" * 60)
    print("🎯 NEXT STEPS:")
    if not lawyer_wallet:
        print("   1. Link lawyer wallet to case (see TRANSFER_TO_LAWYER_FIX.md - Fix #2)")
    if not escrow_contract:
        print("   2. Deploy escrow contract (see TRANSFER_TO_LAWYER_FIX.md - Fix #3)")
    if lawyer_wallet and escrow_contract:
        print("   ✅ All conditions met - try making a payment")
    print("=" * 60)
        
except Exception as e:
    print(f"❌ Error: {e}")
    print("   Make sure MongoDB is running")
