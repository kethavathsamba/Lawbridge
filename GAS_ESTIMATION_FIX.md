# ❌ Gas Estimation Error Fix

## Problem
```
Payment failed: cannot estimate gas; transaction may fail...
Error: execution reverted (reason="execution reverted")
code=UNPREDICTABLE_GAS_LIMIT
```

## Root Cause Analysis

Your contract at `0xd9145CCE52D386f254917e481eB44e9943F39138` is rejecting transaction attempts. The "execution reverted" error with empty data means a `require()` statement is failing.

**Most Likely Causes:**
1. ✓ **Contract State Issue** - The contract has `isDeposited = true`, rejecting new deposit attempts
2. ✓ **Incomplete Deployment** - Contract wasn't deployed with proper constructor arguments (lawyer/platform wallet addresses)
3. ✓ **Logic Bug** - Old contract version has the problematic `isDeposited` flag

## Solution: Redeploy the Contract

### Step 1: Prepare the Updated Contract

The improved contract has been updated with:
- ✅ Removed `isDeposited` flag (allows multiple deposits)
- ✅ Added `depositCount` tracking instead
- ✅ Better error codes (e.g., `ERR_ZERO_AMOUNT`, `ERR_NOT_CLIENT`)
- ✅ Re-entrancy protection (clears `amount` before transfers)
- ✅ Fallback gas limit handling in JavaScript

### Step 2: Deploy on Remix

1. **Go to**: https://remix.ethereum.org/

2. **Create file** `LawBridgeEscrow.sol` and paste:
   - Location: File path shown in left sidebar
   - Copy entire contents from `blockchain/LawBridgeEscrow.sol`

3. **Compile**:
   - Click "Solidity Compiler" in left sidebar
   - Select `Compiler: 0.8.18` (or newer)
   - Click "Compile LawBridgeEscrow.sol"

4. **Deploy**:
   - Click "Deploy & Run Transactions" tab
   - Select network: **Polygon Amoy** from dropdown (may require adding to MetaMask)
   - Set environment: **Injected Provider - MetaMask**
   - Connect MetaMask with sufficient POL (~0.01 POL for deployment)

5. **Constructor Arguments**:
   - `_lawyer`: Enter your lawyer wallet address (e.g., `0x1234...`)
   - `_platformWallet`: Enter your platform admin wallet address (e.g., `0x5678...`)
   - **These MUST be valid addresses**, not empty/zero addresses

6. **Deploy**:
   - Click "Deploy" button
   - MetaMask will prompt - click "Confirm"
   - **Note the new contract address** from deployment receipt

### Step 3: Update Environment Variables

Update `.env`:
```bash
VITE_CONTRACT_ADDRESS=0xNEW_CONTRACT_ADDRESS_HERE
```

Replace with the actual address from Step 2.

### Step 4: Test the Fix

In your browser console or payment page:

```javascript
// Check contract state (read-only)
const escrow = await getEscrowContract();
const status = await escrow.getStatus();
console.log("Contract Status:", status);
// Should return: [0, false, false, 0] (no deposits, no approval, not released, 0 amount)
```

### Step 5: Retry Payment

1. Ensure you have sufficient POL in your wallet:
   - Minimum: 0.0001 POL (payment amount) + 0.0001 POL (gas) = 0.0002 POL
   - Recommended: 0.005 POL for safety

2. Get test POL if needed:
   - Faucet: https://faucet.polygon.technology/
   - Network: Polygon Amoy (Mumbai)

3. Attempt payment again
   - Error should now be resolved
   - Transaction should succeed

## Debugging: Check Contract State

If you still get "execution reverted", the contract state may be corrupt. Check:

```javascript
// In browser console with MetaMask on Amoy network
const provider = new ethers.providers.Web3Provider(window.ethereum);
const escrow = new ethers.Contract(
    "0xCONTRACT_ADDRESS",  // Replace with your contract address
    [{"inputs":[],"name":"getStatus","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bool","name":"","type":"bool"},{"internalType":"bool","name":"","type":"bool"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],  // Minimal ABI
    provider
);

const status = await escrow.getStatus();
console.log({
    depositCount: status[0].toString(),
    adminApproved: status[1],
    isReleased: status[2],
    amount: ethers.utils.formatEther(status[3])
});
```

**Healthy contract state:**
```
{
  depositCount: 0,
  adminApproved: false,
  isReleased: false,
  amount: "0.0"
}
```

If `isReleased = true` or `amount > 0`, the contract needs resetting (redeployment).

## Code Changes Made

### 1. Smart Contract (`blockchain/LawBridgeEscrow.sol`)
- Removed `bool isDeposited` (was blocking deposits)
- Added `uint depositCount` for tracking
- Updated error messages with error codes
- Added re-entrancy protection

### 2. JavaScript (`src/services/blockchain.js`)
- Added gas estimation fallback (uses manual gasLimit: 500000)
- Better error logging and diagnostics
- Improved error messages for debugging

### 3. Error Handling
The code now catches `UNPREDICTABLE_GAS_LIMIT` and provides a fallback before rejecting the transaction.

## Common Issues After Redeployment

| Issue | Solution |
|-------|----------|
| Still getting gas error | Verify new contract address in `.env` matches deployed contract |
| "Only client" error | This error code changed to `ERR_NOT_CLIENT` - verify client address is correct |
| Constructor args wrong | Redeploy with correct lawyer/platform wallet addresses |
| Insufficient POL | Get test POL from faucet (link above) |
| MetaMask on wrong network | Ensure MetaMask is connected to Polygon Amoy (ChainID: 80002) |

## Verification Checklist

- [ ] Old contract address saved for reference (backup): `0xd9145CCE52D386f254917e481eB44e9943F39138`
- [ ] New contract deployed on Remix
- [ ] New contract address noted: `0x...`
- [ ] `.env` file updated with new contract address
- [ ] MetaMask shows balance of test POL (~0.01+)
- [ ] MetaMask connected to Polygon Amoy network
- [ ] Constructor arguments were valid addresses
- [ ] Payment retry succeeds ✅

## Need Help?

If payment still fails:
1. Check browser console for detailed error logs
2. Verify contract state using the debugging commands above
3. Confirm MetaMask network is Polygon Amoy (80002)
4. Ensure wallet has sufficient POL balance
5. Try clearing MetaMask cache: Settings > Advanced > Clear Activity

---
**Last Updated:** 2026-04-27
**Contract Version:** 0.8.18 (improved)
