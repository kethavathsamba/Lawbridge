#!/usr/bin/env python
"""Check current installment requests status"""

from backend.database import get_collection

print("=== CHECKING INSTALLMENT REQUESTS ===\n")

# Check cases with installment requests
cases_coll = get_collection('cases')
cases_with_installments = list(cases_coll.find({'installmentRequests': {'$exists': True, '$ne': []}}))

if cases_with_installments:
    print(f"Found {len(cases_with_installments)} case(s) with installment requests:\n")
    for case in cases_with_installments:
        print(f"Case ID: {case['_id']}")
        print(f"Case Title: {case.get('caseTitle', 'N/A')}")
        print(f"Total Amount: Rs {case.get('amount', 'N/A')}")
        print(f"Escrow Contract: {case.get('escrowContractAddress', 'NOT SET')[:20]}..." if case.get('escrowContractAddress') else "Escrow Contract: NOT SET")
        print(f"Lawyer Wallet: {case.get('lawyerWalletAddress', 'NOT SET')[:20]}..." if case.get('lawyerWalletAddress') else "Lawyer Wallet: NOT SET")
        print(f"\nInstallment Requests:")
        for i, req in enumerate(case.get('installmentRequests', []), 1):
            print(f"  {i}. Rs {req.get('amount')} - Status: {req.get('status')}")
            if req.get('txHash'):
                print(f"     TX Hash: {req['txHash']}")
            if req.get('transferStatus'):
                print(f"     Transfer Status: {req['transferStatus']}")
                if req.get('transferNote'):
                    print(f"     Note: {req['transferNote']}")
        print()
else:
    print("✓ No installment requests found in database\n")

# Check payment history
print("\n=== CHECKING PAYMENT TRANSACTIONS ===\n")
payments_coll = get_collection('escrow_transactions')
transactions = list(payments_coll.find({}))

if transactions:
    print(f"Found {len(transactions)} transaction(s):\n")
    for tx in transactions:
        print(f"Type: {tx.get('type')}")
        print(f"Case ID: {tx.get('caseId')}")
        print(f"Amount: {tx.get('amount')} POL")
        print(f"Status: {tx.get('status')}")
        if tx.get('txHash'):
            print(f"TX Hash: {tx['txHash']}")
        print()
else:
    print("✓ No transactions found\n")
