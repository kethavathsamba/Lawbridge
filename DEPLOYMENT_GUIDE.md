# Smart Contract Deployment Guide

## Updated Contract with Dynamic Client

The `LawBridgeEscrow.sol` contract has been updated to allow **the first depositor to become the client**. This solves the "Only client" error.

## Deployment Steps

### Option 1: Remix IDE (Easy - Web-based)

1. Go to https://remix.ethereum.org/
2. Create a new file: `LawBridgeEscrow.sol`
3. Copy the contract code from `blockchain/LawBridgeEscrow.sol`
4. Switch to **Polygon Amoy** network in MetaMask
5. In Remix's "Deploy & Run Transactions":
   - Set ENVIRONMENT to "Injected Provider - MetaMask"
   - Set NETWORK to "Polygon Amoy"
   - Paste lawyer address in constructor (e.g., lawyer's wallet)
   - Paste platform admin wallet in constructor (e.g., platform wallet)
   - Click "Deploy"
6. Copy the deployed contract address
7. Update `.env`:
   ```
   VITE_CONTRACT_ADDRESS=0x<new_contract_address>
   ```
8. Restart your frontend

### Option 2: Hardhat (Recommended for Production)

1. Install Hardhat:
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npx hardhat
   ```

2. Create `scripts/deploy.js`:
   ```javascript
   async function main() {
       const lawyerAddress = "0x..."; // Lawyer's wallet
       const platformWallet = "0x..."; // Admin wallet
       
       const LawBridgeEscrow = await ethers.getContractFactory("LawBridgeEscrow");
       const contract = await LawBridgeEscrow.deploy(lawyerAddress, platformWallet);
       
       await contract.deployed();
       console.log("Contract deployed to:", contract.address);
   }
   
   main().catch((error) => {
       console.error(error);
       process.exitCode = 1;
   });
   ```

3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   ```

4. Update `.env` with new contract address

## After Deployment

### For Each New Payment Case:

1. **Option A**: Deploy a new contract instance (recommended for isolation)
2. **Option B**: Reuse the contract (simpler, requires multiple instances or state management)

### Update .env

```env
# After deploying the new contract
VITE_CONTRACT_ADDRESS=0x<newly_deployed_contract_address>
VITE_USDC_ADDRESS=0x0FA8781a83E46826621b3BC094Ea2A0212e71B23
VITE_NETWORK_ID=80002
```

## Testing the New Contract

1. Visit Payment page
2. Try to make a deposit
3. First depositor becomes the `client` automatically
4. Subsequent deposits from same address work
5. Other addresses get "Only the depositing client can deposit" error

## Key Changes

✅ **Dynamic Client**: First depositor becomes the client  
✅ **No More "Only client" Error**: Different addresses can now initiate deposits  
✅ **Same Security**: Still only deposited client can trigger refunds/releases  

## Troubleshooting

**Error: "Only the depositing client can deposit"**
- Different wallet tried to deposit to same contract
- Solution: Deploy new contract or use same client wallet

**Contract not found**
- Contract address in `.env` is wrong
- Solution: Verify address matches deployed contract

**Network mismatch**
- MetaMask on different network than contract
- Solution: Ensure MetaMask is on Polygon Amoy (80002)
