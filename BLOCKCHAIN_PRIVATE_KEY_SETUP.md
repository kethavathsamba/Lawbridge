# Blockchain Private Key Setup - Installment Transfers

## Problem
Installments are requested but coins are not transferred to the lawyer's wallet.

## Root Cause
**BLOCKCHAIN_PRIVATE_KEY is missing from `.env`**

The backend needs a private key to:
- Sign blockchain transactions
- Transfer coins from escrow to lawyer wallets
- Record transactions on the blockchain

## Solution

### Step 1: Get Your Private Key

You need the **private key of the wallet that deployed the contract**.

**Option A: If you have MetaMask**
1. Open MetaMask
2. Click Account Details
3. Click "Export Private Key"
4. Copy the private key (starts with 0x or just 64 hex characters)

**Option B: If you used a deployment script**
- Check `deploy-contract.js` or deployment output
- Look for a wallet/account private key

**Option C: Generate a Test Wallet** (testnet only)
```python
from web3 import Web3
account = Web3().eth.account.create()
print(f"Address: {account.address}")
print(f"Private Key: {account.key.hex()}")  # Use this in .env
```

### Step 2: Add to `.env`

Open `backend/.env` and add:

```env
BLOCKCHAIN_PRIVATE_KEY=<your_private_key_without_0x>
```

**Example:**
```env
BLOCKCHAIN_PRIVATE_KEY=abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef9012
```

**⚠️ IMPORTANT:**
- Remove `0x` prefix if present
- This is 64 hex characters (256 bits)
- Keep it secret! Never commit to git or share publicly
- For testnet use only, this is NOT production-safe

### Step 3: Restart Backend

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
python -m uvicorn main:app --reload
```

### Step 4: Test

1. Lawyer requests 1 rupee installment
2. Check backend logs for:
   ```
   [Installment] Attempting automatic transfer to lawyer: 0x...
   ✓ Installment transferred successfully: 0x...
   ```
3. Lawyer's wallet should show the transfer
4. Check Amoy Explorer: https://amoy.polygonscan.com/

## Verification Checklist

- [ ] `.env` has `BLOCKCHAIN_PRIVATE_KEY=<key>`
- [ ] Private key is valid (64 hex characters or with 0x)
- [ ] Wallet has POL balance for gas fees
- [ ] Backend shows "Installment transferred successfully"
- [ ] Transaction appears on Amoy PolygonScan

## Troubleshooting

### "BLOCKCHAIN_PRIVATE_KEY not configured"
→ Add the key to `.env` and restart backend

### "Invalid BLOCKCHAIN_PRIVATE_KEY format"
→ Check key format: should be 64 hex chars (without 0x) or 66 chars (with 0x)

### "Insufficient gas"
→ Your wallet needs POL balance for gas fees (~0.01 POL per transfer)

### Transaction still shows "pending"
→ Check: https://amoy.polygonscan.com/tx/0x... for actual status

## Getting POL on Amoy Testnet

1. Go to: https://faucet.polygon.technology/
2. Select "Polygon Amoy"
3. Enter your wallet address
4. Claim POL tokens

---

**After adding the private key, installments will automatically transfer coins to the lawyer's wallet! ✅**
