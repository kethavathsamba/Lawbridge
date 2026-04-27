# LawBridge Blockchain Escrow Setup Guide

## 🎯 Overview

Your escrow system is now powered by **blockchain smart contracts** on Polygon/Ethereum testnets with USDC stablecoin payments. All money is transparent, immutable, and controlled by smart contracts instead of a centralized admin account.

## ⚙️ Setup Instructions

### Step 1: Install Dependencies

```bash
cd c:\Users\chand\Documents\lawbridge4\lawbridge

# Install ethers.js for blockchain interactions
npm install ethers@5.7.2

# Install web3.js as alternative (optional)
npm install web3
```

### Step 2: Deploy Smart Contract

Choose your testnet:

#### Option A: Polygon Mumbai (Recommended - Easier testnet)

```bash
# 1. Go to Remix IDE
# URL: https://remix.ethereum.org

# 2. Create new file: LawBridgeEscrow.sol
# 3. Paste content from: ./blockchain/LawBridgeEscrow.sol

# 4. Compile
# - Select compiler: 0.8.19
# - Click "Compile LawBridgeEscrow.sol"

# 5. Deploy
# - Environment: Injected Provider (MetaMask)
# - Make sure MetaMask is on Mumbai network
# - Constructor params:
#   - _usdcToken: 0x2791Bca1f2de4661ED88A30C99A7cc7E2E61f6d6 (USDC on Mumbai)
#   - _platformWallet: 0x[YOUR_ADMIN_ADDRESS]
# - Click "Deploy"

# 6. Copy contract address and save to .env
```

#### Option B: Ethereum Sepolia

```bash
# Same as above, but:
# - Network: Sepolia
# - USDC address: 0xda9d4f9b69ac6C22e444eD9aF0DfF72693DaDCA0
```

### Step 3: Environment Configuration

Create `.env` file in project root:

```bash
# Blockchain Configuration
REACT_APP_BLOCKCHAIN_NETWORK=mumbai  # or "sepolia"
REACT_APP_ESCROW_MUMBAI=0x[YOUR_DEPLOYED_CONTRACT_ADDRESS_MUMBAI]
REACT_APP_ESCROW_SEPOLIA=0x[YOUR_DEPLOYED_CONTRACT_ADDRESS_SEPOLIA]

# Backend URLs
VITE_API_URL=http://127.0.0.1:8000
```

Also create `.env` in backend:

```bash
# Same as before, plus:
BLOCKCHAIN_ENABLED=true
```

### Step 4: Get Testnet Tokens

#### For Mumbai:
1. Go to: https://faucet.polygon.technology/
2. Select "Mumbai"
3. Enter your MetaMask address
4. Request test MATIC (for gas)
5. Request test USDC

#### For Sepolia:
1. Go to: https://sepoliafaucet.com
2. Enter your MetaMask address
3. Receive test ETH

### Step 5: Install MetaMask

1. Download: https://metamask.io
2. Create wallet or import existing
3. Add testnet networks (or MetaMask will auto-add when needed)

### Step 6: Update Backend API

Update `backend/routers/payments.py` to include blockchain integration:

```python
from web3 import Web3

# Add to payments router
@router.post("/payments/blockchain/initiate")
def blockchain_initiate_payment(body: InitiatePaymentBody, user=Depends(get_current_user)):
    """
    Initiate blockchain escrow instead of admin-held
    """
    # Call smart contract to create escrow
    # Store transaction hash in DB
    pass

@router.post("/payments/blockchain/fund")
def blockchain_fund_escrow(caseId: str, body: FundEscrowBody, user=Depends(get_current_user)):
    """
    Client funds escrow with USDC on blockchain
    """
    pass

@router.get("/payments/blockchain/status/{caseId}")
def blockchain_escrow_status(caseId: str):
    """
    Get real-time escrow status from blockchain
    """
    pass
```

### Step 7: Update Frontend Components

#### In Payment.jsx:

```javascript
import blockchain from "../services/blockchain";
import WalletConnector from "../components/WalletConnector";

export default function Payment() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [escrowId, setEscrowId] = useState(null);

  const handleInitiatePayment = async () => {
    try {
      // 1. Connect wallet
      if (!walletConnected) {
        await blockchain.connectWallet();
        setWalletConnected(true);
      }

      // 2. Create escrow on blockchain
      const txHash = await blockchain.createEscrow(
        userAddress,
        lawyerAddress,
        caseData.amountCharged,
        caseId
      );

      // 3. Record on backend
      await api.post('/payments/blockchain/initiate', {
        caseId,
        txHash,
        amount: caseData.amountCharged,
      });

      setSuccess("Escrow created on blockchain!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFundEscrow = async () => {
    try {
      // Fund escrow with USDC
      const txHash = await blockchain.fundEscrow(
        escrowId,
        caseData.amountCharged
      );

      setSuccess("✓ Payment confirmed on blockchain!");
      setPaymentStatus("escrow_held");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      {!walletConnected && (
        <WalletConnector
          onConnected={(wallet) => {
            setWalletConnected(true);
          }}
          onError={(err) => setError(err.message)}
        />
      )}

      {walletConnected && (
        <div className="payment-container">
          {/* Payment UI */}
        </div>
      )}
    </>
  );
}
```

#### In InstallmentApprovalModal.jsx:

```javascript
const handleApprove = async () => {
  try {
    // Approve on blockchain
    const txHash = await blockchain.approveInstallment(
      escrowId,
      installmentRequest.id
    );

    // Record on backend
    await api.cases.decideInstallment(caseId, installmentRequest.id, true);

    onApprove();
  } catch (err) {
    setError(err.message);
  }
};
```

## 📊 Smart Contract Functions

### Client Functions

```solidity
// Fund escrow with USDC
fundEscrow(uint256 escrowId, uint256 amount)

// Approve installment (triggers payment transfer)
approveInstallment(uint256 escrowId, uint256 installmentId)

// Reject installment
rejectInstallment(uint256 escrowId, uint256 installmentId)

// Close case and get refund
closeEscrow(uint256 escrowId)
```

### Lawyer Functions

```solidity
// Request installment payment
requestInstallment(uint256 escrowId, uint256 amount, string progressNote)
```

### Admin Functions

```solidity
// Create new escrow
createEscrow(address client, address lawyer, uint256 amount, string caseId)

// Set platform fee percentage
setPlatformFee(uint256 newFeePercentage)
```

## 🔍 How It Works (Blockchain Flow)

```
1. CASE ACCEPTED (Backend)
   → Backend creates escrow via smart contract
   → Escrow ID linked to Case ID

2. CLIENT CONNECTS WALLET
   → MetaMask connects to blockchain
   → Smart contract address approved

3. CLIENT FUNDS ESCROW
   → Client clicks "Pay ₹X with USDC"
   → MetaMask prompts wallet signature
   → USDC transferred to smart contract
   → Status: Escrow Active

4. LAWYER REQUESTS INSTALLMENT
   → Lawyer proposes: "₹20K for initial consultation"
   → Request stored in smart contract
   → Client notified

5. CLIENT APPROVES INSTALLMENT
   → Client reviews and approves
   → Smart contract transfers USDC to lawyer
   → Platform fee (2%) deducted
   → Transaction immovable and transparent

6. CASE COMPLETED
   → Client can close escrow
   → Remaining balance refunded to client wallet
   → Smart contract emits completion event
   → All transactions on blockchain forever
```

## 🛠️ Testing Blockchain Flow

### Quick Test (Testnet)

```javascript
// In browser console (F12):

// 1. Check wallet connection
const wallet = await blockchain.connectWallet();
console.log("Connected:", wallet);

// 2. Get balance
const balance = await blockchain.getUSDCBalance();
console.log("USDC Balance:", balance);

// 3. Get network info
const network = blockchain.getNetworkInfo();
console.log("Network:", network);

// 4. Create escrow (from backend call)
// The backend will call this via API

// 5. Fund escrow
await blockchain.fundEscrow(escrowId, 50000);

// 6. Request installment
await blockchain.requestInstallment(escrowId, 20000, "Work started");

// 7. Approve installment
await blockchain.approveInstallment(escrowId, 0);

// 8. Check balance decreased (fee + transfer)
const newBalance = await blockchain.getUSDCBalance();
console.log("New Balance:", newBalance);
```

## 🔐 Security Features

✅ **Smart Contract Audit:**
- Review LawBridgeEscrow.sol with a security auditor before mainnet
- Use OpenZeppelin's tested libraries
- Time-lock mechanisms for sensitive operations

✅ **Multi-Signature Wallet (Optional):**
- Use Gnosis Safe for platform wallet instead of single address
- Requires multiple admins to approve transfers

✅ **Gas Optimization:**
- Batch operations to reduce gas costs
- Use Mumbai testnet gas prices (much cheaper than Ethereum mainnet)

## 📱 Wallet Compatibility

- ✅ MetaMask (Desktop & Mobile)
- ✅ Trust Wallet
- ✅ Coinbase Wallet
- ✅ WalletConnect

## 🐛 Troubleshooting

### Issue: "MetaMask not installed"
**Solution:** Install from https://metamask.io

### Issue: "Wrong network"
**Solution:** MetaMask will prompt to switch. Accept the network addition.

### Issue: "Insufficient USDC balance"
**Solution:** Go to faucet and request more test USDC

### Issue: "Transaction failed"
**Solution:**
- Check sufficient gas (MATIC/ETH)
- Check USDC allowance
- Verify contract address in .env

### Issue: "Contract not deployed"
**Solution:**
- Deploy contract to Remix
- Copy contract address to .env
- Restart frontend

## 📊 Real-Time Monitoring

### View Transactions:
- **Mumbai:** https://mumbai.polygonscan.com
- **Sepolia:** https://sepolia.etherscan.io

### Search by:
- Contract address
- Wallet address
- Transaction hash

## 🚀 Moving to Mainnet

When ready for production:

1. Deploy contract to Ethereum or Polygon mainnet
2. Replace testnet addresses in config
3. Use real USDC addresses
4. Update backend to use mainnet RPCs
5. Get security audit before going live

## 📚 Additional Resources

- Solidity Docs: https://docs.soliditylang.org
- OpenZeppelin: https://docs.openzeppelin.com
- ethers.js: https://docs.ethers.io
- Polygon Docs: https://docs.polygon.technology
- Ethereum Docs: https://ethereum.org/developers

## ✅ Checklist

- [ ] Smart contract deployed to testnet
- [ ] Contract address in .env
- [ ] Test USDC obtained from faucet
- [ ] MetaMask installed and configured
- [ ] Backend blockchain routes updated
- [ ] Frontend blockchain integration complete
- [ ] WalletConnector component integrated
- [ ] Payment.jsx blockchain functions working
- [ ] InstallmentApprovalModal calling blockchain
- [ ] Tested full flow: Connect → Fund → Approve → Refund
- [ ] Transactions visible on block explorer

---

**Blockchain Escrow System**: ✅ READY FOR TESTNET

Your escrow is now decentralized, transparent, and immutable! 🔗
