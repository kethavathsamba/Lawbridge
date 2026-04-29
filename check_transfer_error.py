#!/usr/bin/env python
"""Check installment transfer status and errors"""

from backend.database import get_collection

print("=== CHECKING INSTALLMENT TRANSFER STATUS ===\n")

# Check escrow transactions
payments_coll = get_collection('escrow_transactions')
transfers = list(payments_coll.find({'type': 'installment_transfer'}))

if transfers:
    print(f"Found {len(transfers)} installment transfer record(s):\n")
    for tx in transfers:
        print(f"Case ID: {tx.get('caseId')}")
        print(f"Amount: Rs {tx.get('amount')}")
        print(f"Status: {tx.get('status')}")
        print(f"TX Hash: {tx.get('txHash', 'None - Transfer Failed')}")
        if tx.get('transferError'):
            print(f"❌ Error: {tx['transferError']}")
        print()
else:
    print("✗ No installment transfer records found")
    print("This means the installment approval either:")
    print("  1. Hasn't been triggered yet")
    print("  2. Failed before it could create a record")
