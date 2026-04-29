#!/usr/bin/env python
"""Check if installment approval triggered blockchain transfer"""

from backend.database import get_collection
from datetime import datetime

print("=== CHECKING INSTALLMENT APPROVAL & TRANSFER STATUS ===\n")

# Get the case
cases_coll = get_collection('cases')
cases = list(cases_coll.find({}))

print(f"Found {len(cases)} case(s)\n")

for case in cases:
    print(f"Case ID: {case['_id']}")
    print(f"Case Title: {case.get('caseTitle', 'N/A')}")
    print(f"Amount Charged: Rs {case.get('amount', 'N/A')}")
    print(f"Amount Paid: Rs {case.get('amountPaid', 0)}")
    print(f"Escrow Amount: Rs {case.get('escrowAmount', 0)}")
    
    # Check installment requests
    installments = case.get('installmentRequests', [])
    if installments:
        print(f"\nInstallment Requests ({len(installments)}):")
        for i, req in enumerate(installments, 1):
            print(f"  {i}. Rs {req.get('amount')} - Status: {req.get('status')}")
            if req.get('status') == 'approved':
                print(f"     ✓ APPROVED at {req.get('approvedAt', 'N/A')}")
                print(f"     Lawyer Wallet: {case.get('lawyerWalletAddress', 'NOT SET')}")
                print(f"     Escrow Contract: {case.get('escrowContractAddress', 'NOT SET')}")
            if req.get('txHash'):
                print(f"     TX Hash: {req.get('txHash')}")
    else:
        print(f"No installment requests")
    
    print()

# Check escrow transactions (blockchain transfers)
print("\n=== CHECKING BLOCKCHAIN TRANSFERS ===\n")
payments_coll = get_collection('escrow_transactions')
transfers = list(payments_coll.find({'type': 'installment_transfer'}))

if transfers:
    print(f"Found {len(transfers)} installment transfer(s):\n")
    for tx in transfers:
        print(f"Transfer for Case: {tx.get('caseId')}")
        print(f"Amount: Rs {tx.get('amount')}")
        print(f"Status: {tx.get('status')}")
        if tx.get('txHash'):
            print(f"TX Hash: {tx['txHash']}")
            print(f"✓ Coins transferred to lawyer!")
        else:
            print(f"Transfer Error: {tx.get('transferError', 'Unknown error')}")
        print(f"Created: {tx.get('createdAt')}")
        print()
else:
    print("✗ No installment transfers found in blockchain records\n")
    print("This means either:")
    print("  1. Client hasn't approved the installment yet")
    print("  2. Blockchain transfer failed")
    print("  3. Required fields (lawyer wallet, escrow contract, private key) are missing")
