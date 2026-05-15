"""Link deployed escrow contract to case."""
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/lawbridge")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client.lawbridge
    
    # Contract address deployed
    CONTRACT_ADDRESS = "0xa046Fe289C86B06036FF14ea68b5254f3a681816"
    CASE_ID = "69f1a0221a08b1cf265d3857"
    
    print("=" * 60)
    print("🔗 LINKING ESCROW CONTRACT TO CASE")
    print("=" * 60)
    print(f"\nContract: {CONTRACT_ADDRESS}")
    print(f"Case ID: {CASE_ID}")
    
    # Update case with escrow contract address
    result = db.cases.update_one(
        {"_id": ObjectId(CASE_ID)},
        {
            "$set": {
                "escrowContractAddress": CONTRACT_ADDRESS,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count > 0:
        print(f"\n✅ Case linked successfully!")
        print(f"   Matched: {result.matched_count}")
        print(f"   Modified: {result.modified_count}")
        
        # Verify
        case = db.cases.find_one({"_id": ObjectId(CASE_ID)})
        if case:
            print(f"\n✓ Verification:")
            print(f"  Lawyer Wallet: {case.get('lawyerWalletAddress')}")
            print(f"  Escrow Contract: {case.get('escrowContractAddress')}")
    else:
        print(f"\n❌ Case not found")
    
    print("\n" + "=" * 60)
    print("🎯 NEXT STEP:")
    print("   Request an installment in the frontend and approve it")
    print("   Coins should now transfer to lawyer wallet automatically!")
    print("=" * 60)
        
except Exception as e:
    print(f"❌ Error: {e}")
