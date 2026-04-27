# 🔗 Blockchain Wallet Integration & Contract Deployment Guide

## Overview

This system automates escrow contract deployment for each case with multiple lawyers. Here's the complete workflow:

```
1. Lawyer connects wallet in Settings → Saves wallet address
2. Client connects wallet in Settings → Saves wallet address  
3. Client creates case with Lawyer
4. Backend automatically generates contract deployment instructions
5. Admin deploys contract in Remix with lawyer's wallet address
6. Contract address stored in case record
7. Client deposits payment → Payment escrow execution
```

## Step 1: Lawyer Setup (Wallet Connection)

### 1.1 Connect MetaMask Wallet

**Location:** Dashboard → Settings → 🔗 Blockchain Wallet

1. Click **"🦊 Connect MetaMask Wallet"** button
2. MetaMask extension pops up
3. Review account and click **"Next"**
4. Click **"Connect"** button

### 1.2 Verify Connection

After connecting:
- ✅ Your wallet address displays (e.g., `0x1234...5678`)
- ✅ Your POL balance shows (e.g., `5.4321 POL`)
- ✅ Network shows: **Polygon Amoy (ChainID: 80002)**

### 1.3 Save Wallet to Profile

1. Click **"💾 Save This Wallet to Profile"**
2. You'll see: **"✅ Wallet address saved successfully!"**
3. Wallet is now linked to your lawyer account

**Why?** Your address will be used as the `_lawyer` parameter when contracts are deployed.

---

## Step 2: Client Setup (Wallet Connection)

**Location:** Dashboard → Settings → 🔗 Blockchain Wallet

Same process as lawyer:

1. Click **"🦊 Connect MetaMask Wallet"**
2. Approve MetaMask connection
3. Verify balance (need at least 0.01 POL for payments)
4. Click **"💾 Save This Wallet to Profile"**

**Why?** Client address is recorded and used later for deposits.

---

## Step 3: Create Case

**Location:** My Cases → Create New Case

### 3.1 Select Lawyer

Choose a lawyer who has **already connected their wallet** in Settings.

### 3.2 Enter Case Details

- Title
- Description  
- Amount
- Court name
- etc.

### 3.3 Submit

When you click **"Create Case"**, the backend:

✅ Creates case record in MongoDB  
✅ Retrieves lawyer's wallet address from their profile  
✅ Retrieves client's wallet address from profile  
✅ Generates contract deployment instructions  
✅ Stores instructions in case record

---

## Step 4: View Deployment Instructions

### 4.1 Check Case Details

After case creation, open the case and look for:

**"🔗 Escrow Contract Information"** section

Shows:
```
Status: READY_FOR_DEPLOYMENT
Network: Polygon Amoy (ChainID: 80002)
Constructor Arguments:
  _lawyer: 0x1234...5678 (Lawyer's wallet)
  _platformWallet: 0x5141...F39138 (Platform admin)
```

### 4.2 Deployment Instructions

```
Step 1: Go to https://remix.ethereum.org/
Step 2: Create file: LawBridgeEscrow.sol
Step 3: Paste contract code
Step 4: Compile with Solidity ^0.8.18
Step 5: Select 'Injected Provider (MetaMask)'
Step 6: Connect MetaMask wallet with ~0.01 POL
Step 7: Deploy with constructor arguments
Step 8: Save deployed contract address
```

---

## Step 5: Deploy Contract (Manual via Remix)

### 5.1 Open Remix

Go to: https://remix.ethereum.org/

### 5.2 Create Contract File

1. Left sidebar → File Explorer
2. Click **"Create New File"**
3. Name: `LawBridgeEscrow.sol`
4. Paste entire contract code from `blockchain/LawBridgeEscrow.sol`

### 5.3 Compile Contract

1. Left sidebar → Click **"Solidity Compiler"**
2. Compiler version: Select **0.8.18** (or newer)
3. Click **"Compile LawBridgeEscrow.sol"** button
4. ✅ Should show green checkmark "Compilation successful"

### 5.4 Prepare Deployment

1. Left sidebar → Click **"Deploy & Run Transactions"**
2. Environment dropdown: Change from **"Remix VM"** → **"Injected Provider (MetaMask)"**
3. MetaMask pops up asking to connect
4. Select account (usually Account 1)
5. Click **"Connect"**

### 5.5 Set Constructor Arguments

In the deploy panel, you'll see:

```
_lawyer        [________address________]
_platformWallet [________address________]
```

Fill in:
- **_lawyer**: Lawyer's wallet address (from case deployment info)
  - Example: `0x1234567890123456789012345678901234567890`
- **_platformWallet**: Platform admin wallet
  - Use: `0x5141Ee6E996Fd9653fB4467d4c86471084FF3D29`

### 5.6 Deploy

1. Click **"Deploy"** button (orange button below inputs)
2. MetaMask pops up with gas estimate
3. Review gas cost (usually ~200-400k gas = ~0.005-0.01 POL)
4. Click **"Confirm"** in MetaMask
5. Wait for confirmation...

### 5.7 Copy Contract Address

After deployment succeeds:

1. Check **"Deployed Contracts"** section at bottom
2. You'll see: `LawBridgeEscrow at 0xabcd1234...`
3. Click the copy icon next to the address
4. **Save this address** - you need it next!

---

## Step 6: Update Case with Contract Address

### 6.1 In the Application

Go back to your case and look for:

**"Update Escrow Contract"** field

Paste the deployed contract address:
```
0xabcd1234567890123456789012345678abcd1234
```

### 6.2 Save

Click **"Save"** or **"Update"** button

✅ Case now has contract address linked

---

## Step 7: Client Makes Payment

### 7.1 Initiate Payment

In the case view, client clicks:

**"Pay via Escrow"** or **"Deposit to Escrow"**

### 7.2 Confirm Details

- Amount: Shows case amount
- Lawyer: Shows lawyer name and address
- Network: Shows Polygon Amoy

### 7.3 Approve Transaction

1. Click **"Process Payment"**
2. MetaMask pops up showing transaction details
3. Review gas estimate
4. Click **"Confirm"** in MetaMask
5. Wait for confirmation on blockchain

### 7.4 Payment Success

Once confirmed:

✅ Funds locked in escrow contract  
✅ Case status: "Payment Received"  
✅ Lawyer notified  
✅ Admin can release payment when case is complete

---

## Troubleshooting

### ❌ "Wallet not found"

**Problem:** No connected wallet in MetaMask

**Solution:**
1. Open MetaMask extension
2. Verify you're on Polygon Amoy network
3. Check you have an account selected
4. Return to Settings and try connecting again

---

### ❌ "Invalid wallet address format"

**Problem:** Wallet address saved incorrectly

**Solution:**
1. Go to Settings
2. Disconnect wallet
3. Reconnect wallet
4. Save again (should be auto-formatted)

---

### ❌ "Constructor arguments not set"

**Problem:** Deployment without setting _lawyer and _platformWallet

**Solution:**
1. In Remix, check constructor args fields
2. Paste correct addresses (must start with `0x` and be 42 chars)
3. Click Deploy again

---

### ❌ "Out of gas" during deployment

**Problem:** Insufficient POL balance

**Solution:**
1. Get more test POL from: https://faucet.polygon.technology/
2. Select Network: **Polygon Amoy**
3. Paste your wallet address
4. Click "Send Me Matic" (you'll receive ~1 POL)
5. Wait ~1 minute
6. Try deployment again

---

### ❌ "Execution reverted" during payment

**Problem:** Contract call failed

**Common Causes:**
1. Contract address wrong in case record
2. Contract not deployed to specified address
3. Contract state corrupted
4. Client wallet is not the one who will deposit

**Solution:**
1. Verify contract address in case
2. Check contract deployed to that address: https://amoy.polygonscan.com/
3. Try small test amount first
4. Contact support if persists

---

## Wallet Addresses Reference

| Role | Where Used | Notes |
|------|-----------|-------|
| **Lawyer** | `_lawyer` in constructor | Receives payment after case completion |
| **Client** | First caller of `deposit()` | Sends payment to escrow |
| **Platform Admin** | `_platformWallet` | Approves case completion and releases payment |

---

## Database Schema

### User Document Update

```json
{
  "_id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "role": "lawyer" | "client"
}
```

### Case Document Update

```json
{
  "_id": "case_id",
  "clientId": "client_user_id",
  "lawyerId": "lawyer_user_id",
  "clientWalletAddress": "0xclient1234...",
  "lawyerWalletAddress": "0xlawyer1234...",
  "escrowContractAddress": "0xcontract1234...",
  "escrowDeploymentInfo": {
    "status": "READY_FOR_DEPLOYMENT" | "DEPLOYED",
    "constructor_args": {
      "_lawyer": "0xlawyer1234...",
      "_platformWallet": "0x5141..."
    },
    "deployment_instructions": { ... }
  }
}
```

---

## API Endpoints

### Update Wallet Address

**POST** `/api/auth/update-wallet`

```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet address updated successfully",
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

---

### Get Deployment Instructions

**GET** `/api/cases/{caseId}`

Response includes:
```json
{
  "escrowDeploymentInfo": {
    "status": "READY_FOR_DEPLOYMENT",
    "constructor_args": {
      "_lawyer": "0x...",
      "_platformWallet": "0x..."
    }
  }
}
```

---

## Next Steps

After testing:

1. **Store Contract Bytecode**: Update `CONTRACT_BYTECODE` env variable with compiled bytecode from Remix
2. **Automate Deployment**: Integrate contract deployment with private key (requires securing private key)
3. **Add Deployment Endpoint**: Create backend endpoint to deploy contracts programmatically
4. **Notifications**: Send notifications when contract deployed

---

## Files Modified/Created

✅ **Created:**
- `src/components/WalletSettings.jsx` - MetaMask connection UI
- `backend/contract_deployer.py` - Contract deployment utilities
- `.env` - Updated with blockchain configuration

✅ **Updated:**
- `src/pages/ClientSettings.jsx` - Added WalletSettings
- `src/pages/lawyer/Settings.jsx` - Added WalletSettings
- `backend/routers/auth.py` - Added `/auth/update-wallet` endpoint
- `backend/routers/cases.py` - Auto-generate deployment info on case creation

---

## Support

For issues:
1. Check browser console for errors (F12)
2. Check backend logs (`tail -f backend.log`)
3. Verify contract on Amoy explorer: https://amoy.polygonscan.com/
4. Test with small amounts first
5. Contact: support@lawbridge.dev

---

**Last Updated:** 2026-04-27  
**Network:** Polygon Amoy (ChainID: 80002)  
**Contract Version:** 0.8.18+
