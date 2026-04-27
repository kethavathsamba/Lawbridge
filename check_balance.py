#!/usr/bin/env python3
"""Check MetaMask wallet balance on Polygon Amoy"""

from web3 import Web3

# Polygon Amoy RPC
amoy_rpc = "https://rpc-amoy.polygon.technology/"
w3 = Web3(Web3.HTTPProvider(amoy_rpc))

# Wallet address
address = "0x5141Ee6E996Fd9653fB4467d4c86471084FF3D29"
addr_checksum = Web3.to_checksum_address(address)

# Get balance
balance_wei = w3.eth.get_balance(addr_checksum)
balance_pol = w3.from_wei(balance_wei, 'ether')

# Get gas price
gas_price_gwei = w3.from_wei(w3.eth.gas_price, 'gwei')

# Get nonce
nonce = w3.eth.get_transaction_count(addr_checksum)

# Print results
print("\n" + "="*70)
print("METAMASK WALLET BALANCE - POLYGON AMOY TESTNET")
print("="*70)
print(f"Address:           {addr_checksum}")
print(f"Balance:           {balance_pol:.8f} POL")
print(f"Balance (Wei):     {balance_wei}")
print(f"Gas Price:         {gas_price_gwei:.4f} Gwei")
print(f"Transaction Count: {nonce}")
print(f"Network:           Polygon Amoy (Testnet)")
print(f"Chain ID:          80002")
print("="*70)

# Status check
if balance_pol > 0:
    print(f"\n[OK] Wallet has {balance_pol:.8f} POL")
    if balance_pol > 0.1:
        print("     Sufficient balance for multiple transactions")
    elif balance_pol > 0.01:
        print("     Moderate balance - good for testing")
    else:
        print("     Low balance - consider getting more from faucet")
else:
    print("\n[WARNING] Wallet has 0 POL")
    print("          Get test tokens from: https://faucet.polygon.technology/")

print("\n")
