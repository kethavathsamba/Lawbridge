"""Query deployed contract to verify actual lawyer address."""
from web3 import Web3
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Contract details
CONTRACT_ADDRESS = "0xa046Fe289C86B06036FF14ea68b5254f3a681816"
PROVIDER_URL = "https://rpc-amoy.polygon.technology/"

# Simple ABI for reading public variables
ABI = [
    {
        "name": "lawyer",
        "outputs": [{"type": "address"}],
        "type": "function",
        "stateMutability": "view"
    },
    {
        "name": "platformWallet", 
        "outputs": [{"type": "address"}],
        "type": "function",
        "stateMutability": "view"
    },
    {
        "name": "client",
        "outputs": [{"type": "address"}],
        "type": "function",
        "stateMutability": "view"
    },
    {
        "name": "amount",
        "outputs": [{"type": "uint256"}],
        "type": "function",
        "stateMutability": "view"
    }
]

try:
    web3 = Web3(Web3.HTTPProvider(PROVIDER_URL, request_kwargs={"timeout": 10}))
    
    if not web3.is_connected():
        print("❌ Cannot connect to blockchain provider")
        exit(1)
    
    print("=" * 70)
    print("🔗 DEPLOYED CONTRACT STATE CHECK")
    print("=" * 70)
    print(f"\nContract Address: {CONTRACT_ADDRESS}")
    print(f"Network: Polygon Amoy")
    
    contract = web3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=ABI
    )
    
    # Read stored values
    lawyer = contract.functions.lawyer().call()
    platform = contract.functions.platformWallet().call()
    client = contract.functions.client().call()
    amount = contract.functions.amount().call()
    
    print(f"\n📋 CONTRACT STATE:")
    print(f"  Lawyer Address:      {lawyer}")
    print(f"  Platform Wallet:     {platform}")
    print(f"  Client Address:      {client}")
    print(f"  Held Amount:         {Web3.from_wei(amount, 'ether')} POL")
    
    print(f"\n" + "=" * 70)
    print("✓ VERIFICATION:")
    print("=" * 70)
    
    EXPECTED_LAWYER = "0xda0acc5c43c4f8c8ae8285fc99ae999a7a0e7396"
    TX_TO_ADDRESS = "0x0965C44D37fC71cFFEF0Bd68E478b821481A8060"
    
    if lawyer.lower() == EXPECTED_LAWYER.lower():
        print(f"✅ Lawyer address in contract is CORRECT")
        print(f"   {lawyer}")
    else:
        print(f"❌ Lawyer address in contract is WRONG")
        print(f"   Expected: {EXPECTED_LAWYER}")
        print(f"   Actual:   {lawyer}")
        print(f"   TX went to: {TX_TO_ADDRESS}")
    
    if lawyer.lower() == TX_TO_ADDRESS.lower():
        print(f"\n⚠️  The TX 'To' address matches the contract's lawyer!")
    else:
        print(f"\n⚠️  TX 'To' address ({TX_TO_ADDRESS})")
        print(f"   does NOT match contract lawyer ({lawyer})")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
