# 🚀 LawBridge Blockchain Integration — Executable Checklist

**Status:** Ready for Implementation  
**Target:** Polygon Mumbai Testnet  
**Goal:** Full escrow + installment payment system  

---

## ✅ PHASE 1: PREREQUISITES & SETUP

### Step 1.1: Install Dependencies

```bash
cd lawbridge
npm install ethers@5
```

**Verify:**
```bash
npm list ethers
# Should show: ethers@5.7.2 (or similar v5.x)
```

### Step 1.2: Create Project Directories

```bash
mkdir -p src/contracts
mkdir -p src/services
```

---

## 🔗 PHASE 2: SMART CONTRACT DEPLOYMENT

### Step 2.1: Prepare Contract ABI

**Agent Task:**
1. Open [blockchain/LawBridgeEscrow.sol](blockchain/LawBridgeEscrow.sol)
2. Deploy using **Remix IDE** (https://remix.ethereum.org):
   - Copy contract code to Remix
   - Compile (Solidity 0.8.19)
   - Connect MetaMask to **Polygon Mumbai Testnet**
   - Deploy contract
3. **OR** Deploy using Hardhat:
   ```bash
   cd blockchain
   npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network mumbai
   ```

### Step 2.2: Export Contract ABI

**After deployment, create:**

```bash
# File: src/contracts/LawBridgeEscrow.json
```

**Contents:** (Copy from Remix or Hardhat)
```json
[
  {
    "inputs": [
      {"internalType": "address", "name": "lawyer", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "string", "name": "caseId", "type": "string"}
    ],
    "name": "createEscrow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // ... (rest of ABI)
]
```

**📌 Save these values for Step 3:**
- `CONTRACT_ADDRESS` (from deployment)
- `USDC_ADDRESS` on Mumbai (typically: `0x0FA8781a83E46826621b3BC094Ea2A0212e71B23`)

---

## 🔑 PHASE 3: ENVIRONMENT CONFIGURATION

### Step 3.1: Frontend Environment Variables

**Create/Update:** `.env` (in project root)

```env
VITE_CONTRACT_ADDRESS=0x<your_deployed_contract_address>
VITE_USDC_ADDRESS=0x0FA8781a83E46826621b3BC094Ea2A0212e71B23
VITE_NETWORK_ID=80001
VITE_API_URL=http://localhost:8000
```

### Step 3.2: Backend Environment Variables

**Update:** `backend/.env`

```env
MONGODB_URI=mongodb://localhost:27017/lawbridge
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:5173
WEB3_PROVIDER_URL=https://rpc-mumbai.maticvigil.com
CONTRACT_ADDRESS=0x<your_deployed_contract_address>
```

### Step 3.3: Verify Setup

```bash
# Frontend
echo $env:VITE_CONTRACT_ADDRESS  # Windows PowerShell
echo $VITE_CONTRACT_ADDRESS      # Mac/Linux

# Backend
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('CONTRACT_ADDRESS'))"
```

---

## 🔌 PHASE 4: BLOCKCHAIN CONFIGURATION

### Step 4.1: Create Blockchain Config

**File:** `src/services/blockchain-config.js`

```javascript
import escrowABI from "../contracts/LawBridgeEscrow.json";
import { ethers } from "ethers";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
export const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS;

/**
 * Get the default provider (read-only)
 */
export const getProvider = () => {
    if (typeof window === "undefined") return null;
    
    if (!window.ethereum) {
        console.error("MetaMask not installed");
        return null;
    }
    
    return new ethers.providers.Web3Provider(window.ethereum);
};

/**
 * Get the signer (write access, requires connected wallet)
 */
export const getSigner = async () => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not available");
    
    try {
        const signer = provider.getSigner();
        return signer;
    } catch (err) {
        console.error("Failed to get signer:", err);
        throw err;
    }
};

/**
 * Get Escrow contract instance
 */
export const getEscrowContract = async () => {
    const signer = await getSigner();
    if (!signer) throw new Error("Signer not available");
    
    return new ethers.Contract(CONTRACT_ADDRESS, escrowABI, signer);
};

/**
 * Get current connected account
 */
export const getConnectedAccount = async () => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not available");
    
    const accounts = await provider.listAccounts();
    return accounts[0] || null;
};

/**
 * Switch network to Mumbai (optional convenience function)
 */
export const switchToMumbai = async () => {
    if (!window.ethereum) throw new Error("MetaMask not available");
    
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x13881" }] // 80001 in hex
        });
    } catch (err) {
        if (err.code === 4902) {
            // Network not added, add it
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                    {
                        chainId: "0x13881",
                        chainName: "Polygon Mumbai",
                        rpcUrls: ["https://rpc-mumbai.maticvigil.com"],
                        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                        blockExplorerUrls: ["https://mumbai.polygonscan.com"]
                    }
                ]
            });
        }
    }
};
```

**✅ Verification:**
```bash
npm run dev
# Open browser console: 
# Type: await import("./src/services/blockchain-config.js").then(m => m.getConnectedAccount())
# Should return wallet address or null
```

---

## 👛 PHASE 5: WALLET CONNECTION

### Step 5.1: Update WalletConnector Component

**File:** `src/components/WalletConnector.jsx`

```javascript
import React, { useState, useEffect } from "react";
import { getConnectedAccount, switchToMumbai } from "../services/blockchain-config";
import "./WalletConnector.css";

export const WalletConnector = ({ onConnect }) => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check if wallet already connected
        checkConnection();
        
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", handleAccountChange);
            window.ethereum.on("chainChanged", () => window.location.reload());
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener("accountsChanged", handleAccountChange);
            }
        };
    }, []);

    const checkConnection = async () => {
        try {
            const acc = await getConnectedAccount();
            if (acc) {
                setAccount(acc);
                onConnect?.(acc);
            }
        } catch (err) {
            console.error("Connection check failed:", err);
        }
    };

    const handleAccountChange = (accounts) => {
        if (accounts.length === 0) {
            setAccount(null);
            setError("Wallet disconnected");
        } else {
            setAccount(accounts[0]);
            onConnect?.(accounts[0]);
        }
    };

    const connectWallet = async () => {
        setLoading(true);
        setError(null);

        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error("MetaMask not installed. Please install it first.");
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            const acc = accounts[0];
            setAccount(acc);
            onConnect?.(acc);

            // Optionally switch to Mumbai network
            try {
                await switchToMumbai();
            } catch (networkErr) {
                console.warn("Network switch failed (non-critical):", networkErr);
            }
        } catch (err) {
            setError(err.message || "Failed to connect wallet");
            console.error("Wallet connection failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const disconnectWallet = async () => {
        setAccount(null);
        setError(null);
        // Note: MetaMask doesn't have a disconnect RPC method
        // This just clears local state
    };

    return (
        <div className="wallet-connector">
            {account ? (
                <div className="connected">
                    <span className="address">
                        {account.substring(0, 6)}...{account.substring(38)}
                    </span>
                    <button onClick={disconnectWallet} className="disconnect-btn">
                        Disconnect
                    </button>
                </div>
            ) : (
                <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="connect-btn"
                >
                    {loading ? "Connecting..." : "Connect Wallet"}
                </button>
            )}
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export const connectWallet = async () => {
    if (!window.ethereum) {
        throw new Error("MetaMask not installed");
    }

    const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
    });

    return accounts[0];
};
```

### Step 5.2: Update CSS

**File:** `src/components/WalletConnector.css`

```css
.wallet-connector {
    padding: 10px;
    background: #f0f0f0;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.connected {
    display: flex;
    align-items: center;
    gap: 10px;
}

.address {
    font-family: monospace;
    font-weight: bold;
    color: #333;
}

.connect-btn,
.disconnect-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s;
}

.connect-btn {
    background: #6366f1;
    color: white;
}

.connect-btn:hover:not(:disabled) {
    background: #4f46e5;
}

.connect-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.disconnect-btn {
    background: #ef4444;
    color: white;
}

.disconnect-btn:hover {
    background: #dc2626;
}

.error-message {
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 5px;
}
```

**✅ Test:**
```bash
npm run dev
# Click "Connect Wallet" button
# MetaMask popup should appear
```

---

## 💰 PHASE 6: USDC INTEGRATION

### Step 6.1: Create USDC Service

**File:** `src/services/usdc.js`

```javascript
import { ethers } from "ethers";
import { getSigner } from "./blockchain-config";

const USDC_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() public view returns (uint8)",
    "function symbol() public view returns (string)"
];

/**
 * Get USDC contract instance
 * @param {string} usdcAddress - USDC contract address
 * @returns {ethers.Contract}
 */
export const getUSDCContract = async (usdcAddress) => {
    const signer = await getSigner();
    return new ethers.Contract(usdcAddress, USDC_ABI, signer);
};

/**
 * Approve USDC spending for escrow contract
 * @param {string} usdcAddress - USDC contract address
 * @param {string} spenderAddress - Address to approve (escrow contract)
 * @param {string} amount - Amount in USDC (in wei, 6 decimals)
 * @returns {Promise<string>} Transaction hash
 */
export const approveUSDC = async (usdcAddress, spenderAddress, amount) => {
    try {
        const usdc = await getUSDCContract(usdcAddress);
        
        console.log(`Approving ${amount} USDC for ${spenderAddress}...`);
        
        const tx = await usdc.approve(spenderAddress, amount);
        console.log("Approval tx:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("Approval confirmed:", receipt);
        
        return tx.hash;
    } catch (err) {
        console.error("USDC approval failed:", err);
        throw err;
    }
};

/**
 * Get USDC balance of account
 * @param {string} usdcAddress - USDC contract address
 * @param {string} account - Account address
 * @returns {Promise<string>} Balance in USDC (as string)
 */
export const getUSDCBalance = async (usdcAddress, account) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const usdc = new ethers.Contract(usdcAddress, USDC_ABI, provider);
    
    const balance = await usdc.balanceOf(account);
    const decimals = await usdc.decimals();
    
    return ethers.utils.formatUnits(balance, decimals);
};

/**
 * Convert USDC amount to wei (6 decimals)
 * @param {string|number} amount - Amount in USDC
 * @returns {string} Amount in wei
 */
export const parseUSDC = (amount) => {
    return ethers.utils.parseUnits(String(amount), 6);
};

/**
 * Convert wei to USDC amount (6 decimals)
 * @param {string|BigNumber} amountInWei - Amount in wei
 * @returns {string} Amount in USDC
 */
export const formatUSDC = (amountInWei) => {
    return ethers.utils.formatUnits(amountInWei, 6);
};
```

**✅ Test:**
```bash
# In browser console:
# import { getUSDCBalance, parseUSDC } from "./src/services/usdc.js"
# getUSDCBalance("0x0FA8781a83E46826621b3BC094Ea2A0212e71B23", "YOUR_WALLET_ADDRESS")
```

---

## 🔄 PHASE 7: ESCROW PAYMENT FUNCTIONS

### Step 7.1: Create Payment Service

**File:** `src/services/blockchain.js`

```javascript
import { getEscrowContract, CONTRACT_ADDRESS } from "./blockchain-config";
import { approveUSDC, parseUSDC } from "./usdc";

/**
 * Create escrow and deposit funds
 * 
 * Flow:
 * 1. Create escrow on contract
 * 2. Approve USDC spending
 * 3. Deposit funds into escrow
 * 
 * @param {string} lawyerAddress - Lawyer's wallet address
 * @param {string|number} amountUSDC - Amount in USDC (not wei)
 * @param {string} caseId - MongoDB case ID (for reference)
 * @param {string} usdcAddress - USDC token contract address
 * @returns {Promise<{escrowId: string, txHash: string}>}
 */
export const createEscrowAndDeposit = async (
    lawyerAddress,
    amountUSDC,
    caseId,
    usdcAddress
) => {
    try {
        console.log(`[Escrow] Starting payment flow...`);
        console.log(`  - Lawyer: ${lawyerAddress}`);
        console.log(`  - Amount: ${amountUSDC} USDC`);
        console.log(`  - Case ID: ${caseId}`);

        const escrow = await getEscrowContract();
        const amountInWei = parseUSDC(amountUSDC);

        // Step 1: Create Escrow
        console.log("[Step 1/3] Creating escrow on blockchain...");
        const tx1 = await escrow.createEscrow(
            lawyerAddress,
            amountInWei,
            caseId
        );
        
        console.log("  - TX Hash:", tx1.hash);
        const receipt1 = await tx1.wait();
        console.log("  - Confirmed ✓");

        // Extract escrowId from event
        const escrowCreatedEvent = receipt1.events?.find(
            (e) => e.event === "EscrowCreated"
        );
        const escrowId = escrowCreatedEvent?.args?.escrowId?.toString();

        if (!escrowId) {
            throw new Error("Failed to extract escrowId from event");
        }

        console.log(`  - Escrow ID: ${escrowId}`);

        // Step 2: Approve USDC
        console.log("[Step 2/3] Approving USDC spending...");
        const approveTx = await approveUSDC(
            usdcAddress,
            CONTRACT_ADDRESS,
            amountInWei
        );
        console.log("  - Approval TX:", approveTx);
        console.log("  - Confirmed ✓");

        // Step 3: Deposit Funds
        console.log("[Step 3/3] Depositing funds into escrow...");
        const tx3 = await escrow.depositFunds(escrowId, amountInWei);
        
        console.log("  - TX Hash:", tx3.hash);
        const receipt3 = await tx3.wait();
        console.log("  - Confirmed ✓");

        console.log("[SUCCESS] Escrow created and funded!");

        return {
            escrowId: escrowId.toString(),
            txHash: receipt3.transactionHash
        };
    } catch (err) {
        console.error("[ERROR] Escrow creation failed:", err);
        throw err;
    }
};

/**
 * Request installment payment
 * @param {string} escrowId - Escrow ID
 * @param {string|number} amountUSDC - Installment amount in USDC
 * @param {string} progressNote - Description of work completed
 * @returns {Promise<string>} Transaction hash
 */
export const requestInstallment = async (
    escrowId,
    amountUSDC,
    progressNote
) => {
    try {
        console.log(`[Installment] Requesting ${amountUSDC} USDC...`);
        
        const escrow = await getEscrowContract();
        const amountInWei = parseUSDC(amountUSDC);

        const tx = await escrow.requestInstallment(
            escrowId,
            amountInWei,
            progressNote
        );
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Installment request failed:", err);
        throw err;
    }
};

/**
 * Approve installment payment (CLIENT)
 * @param {string} installmentId - Installment ID
 * @returns {Promise<string>} Transaction hash
 */
export const approveInstallment = async (installmentId) => {
    try {
        console.log(`[Installment] Approving installment ${installmentId}...`);
        
        const escrow = await getEscrowContract();
        const tx = await escrow.approveInstallment(installmentId);
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Installment approval failed:", err);
        throw err;
    }
};

/**
 * Release installment funds (ADMIN)
 * @param {string} installmentId - Installment ID
 * @returns {Promise<string>} Transaction hash
 */
export const releaseInstallment = async (installmentId) => {
    try {
        console.log(`[Installment] Releasing funds for ${installmentId}...`);
        
        const escrow = await getEscrowContract();
        const tx = await escrow.releaseInstallment(installmentId);
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Installment release failed:", err);
        throw err;
    }
};

/**
 * Cancel escrow and refund to client (ADMIN/CLIENT)
 * @param {string} escrowId - Escrow ID
 * @returns {Promise<string>} Transaction hash
 */
export const cancelEscrow = async (escrowId) => {
    try {
        console.log(`[Escrow] Cancelling escrow ${escrowId}...`);
        
        const escrow = await getEscrowContract();
        const tx = await escrow.cancelEscrow(escrowId);
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Escrow cancellation failed:", err);
        throw err;
    }
};
```

---

## 🧾 PHASE 8: PAYMENT PAGE INTEGRATION

### Step 8.1: Update Payment Component

**File:** `src/pages/Payment.jsx`

```javascript
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createEscrowAndDeposit } from "../services/blockchain";
import { getConnectedAccount } from "../services/blockchain-config";
import { getUSDCBalance } from "../services/usdc";
import "./Payment.css";

export default function Payment() {
    const location = useLocation();
    const navigate = useNavigate();
    const { caseId, lawyerAddress, amountUSDC } = location.state || {};

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [balance, setBalance] = useState(null);
    const [connectedAccount, setConnectedAccount] = useState(null);

    useEffect(() => {
        // Check connection and balance
        checkWallet();
    }, []);

    const checkWallet = async () => {
        try {
            const account = await getConnectedAccount();
            if (!account) {
                setError("Please connect your wallet first");
                return;
            }

            setConnectedAccount(account);

            // Check USDC balance
            const bal = await getUSDCBalance(
                import.meta.env.VITE_USDC_ADDRESS,
                account
            );
            setBalance(bal);

            if (parseFloat(bal) < parseFloat(amountUSDC)) {
                setError(
                    `Insufficient balance. You have ${bal} USDC, need ${amountUSDC}`
                );
            }
        } catch (err) {
            setError(`Wallet check failed: ${err.message}`);
        }
    };

    const handlePayment = async () => {
        if (!caseId || !lawyerAddress || !amountUSDC) {
            setError("Missing payment details");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log("=== PAYMENT FLOW START ===");
            console.log({
                caseId,
                lawyerAddress,
                amountUSDC,
                connectedAccount
            });

            // Call blockchain function
            const result = await createEscrowAndDeposit(
                lawyerAddress,
                amountUSDC,
                caseId,
                import.meta.env.VITE_USDC_ADDRESS
            );

            console.log("=== BLOCKCHAIN SUCCESS ===");
            console.log(result);

            // Send to backend to record in database
            console.log("=== NOTIFYING BACKEND ===");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/payments/confirm`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({
                        caseId,
                        escrowId: result.escrowId,
                        txHash: result.txHash,
                        amountUSDC,
                        lawyerAddress,
                        clientAddress: connectedAccount
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            const backendResult = await response.json();
            console.log("=== BACKEND RESPONSE ===");
            console.log(backendResult);

            setSuccess(true);
            setTxHash(result.txHash);
        } catch (err) {
            console.error("=== PAYMENT FAILED ===");
            console.error(err);
            setError(err.message || "Payment failed");
        } finally {
            setLoading(false);
        }
    };

    if (!caseId) {
        return <div className="payment-error">Missing case information</div>;
    }

    return (
        <div className="payment-container">
            <div className="payment-card">
                <h1>Payment Details</h1>

                <div className="payment-info">
                    <div className="info-row">
                        <span>Case ID:</span>
                        <span className="value">{caseId}</span>
                    </div>
                    <div className="info-row">
                        <span>Lawyer Address:</span>
                        <span className="value mono">{lawyerAddress}</span>
                    </div>
                    <div className="info-row">
                        <span>Amount:</span>
                        <span className="value">{amountUSDC} USDC</span>
                    </div>
                    <div className="info-row">
                        <span>Your Balance:</span>
                        <span className="value">
                            {balance ? `${balance} USDC` : "Loading..."}
                        </span>
                    </div>
                </div>

                {error && <div className="error-box">{error}</div>}

                {success ? (
                    <div className="success-box">
                        <h2>✓ Payment Successful!</h2>
                        <p>
                            Your escrow has been created and funded on the
                            blockchain.
                        </p>
                        <div className="tx-details">
                            <p>
                                <strong>Transaction:</strong>
                            </p>
                            <a
                                href={`https://mumbai.polygonscan.com/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tx-link"
                            >
                                View on Polygonscan
                            </a>
                        </div>
                        <button
                            onClick={() => navigate("/client/cases")}
                            className="btn-primary"
                        >
                            Back to Cases
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handlePayment}
                        disabled={loading || !balance || parseFloat(balance) < parseFloat(amountUSDC)}
                        className="btn-primary btn-large"
                    >
                        {loading ? "Processing..." : "Pay with USDC"}
                    </button>
                )}
            </div>
        </div>
    );
}
```

### Step 8.2: Update Payment CSS

**File:** `src/pages/Payment.css`

```css
.payment-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}

.payment-card {
    background: white;
    border-radius: 12px;
    padding: 40px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.payment-card h1 {
    margin-bottom: 30px;
    color: #1f2937;
}

.payment-info {
    margin-bottom: 30px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #e5e7eb;
}

.info-row span:first-child {
    font-weight: 600;
    color: #4b5563;
}

.info-row .value {
    color: #1f2937;
    text-align: right;
}

.info-row .value.mono {
    font-family: monospace;
    font-size: 0.9em;
}

.error-box {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.success-box {
    background: #efe;
    border: 1px solid #cfc;
    color: #3a3;
    padding: 20px;
    border-radius: 4px;
    margin-bottom: 20px;
    text-align: center;
}

.tx-details {
    margin: 15px 0;
}

.tx-link {
    color: #3a3;
    text-decoration: underline;
}

.btn-primary {
    background: #6366f1;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
    background: #4f46e5;
    transform: translateY(-2px);
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-large {
    width: 100%;
    padding: 14px 24px;
    font-size: 1em;
}

.payment-error {
    text-align: center;
    padding: 40px;
    color: #dc2626;
}
```

---

## 🧠 PHASE 9: BACKEND PAYMENT VERIFICATION

### Step 9.1: Update Backend Payment Router

**File:** `backend/routers/payments.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from bson.objectid import ObjectId
from web3 import Web3
import os

from database import get_db
from auth_utils import get_current_user
from models import User

router = APIRouter(prefix="/payments", tags=["payments"])

# Web3 setup for verification
web3 = Web3(Web3.HTTPProvider(os.getenv("WEB3_PROVIDER_URL")))

class PaymentConfirmRequest(BaseModel):
    caseId: str
    escrowId: str
    txHash: str
    amountUSDC: float
    lawyerAddress: str
    clientAddress: str

@router.post("/confirm")
async def confirm_payment(
    request: PaymentConfirmRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Verify blockchain transaction and record payment in database
    """
    try:
        # Step 1: Verify transaction on blockchain
        print(f"[Payment] Verifying TX: {request.txHash}")
        
        if not web3.is_connected():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Web3 connection failed"
            )
        
        # Get transaction receipt
        tx_receipt = web3.eth.get_transaction_receipt(request.txHash)
        
        if not tx_receipt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction not found on blockchain"
            )
        
        if tx_receipt["status"] != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction failed on blockchain"
            )
        
        print(f"  ✓ TX verified: {request.txHash}")
        
        # Step 2: Record in database
        payment_record = {
            "caseId": request.caseId,
            "clientId": str(current_user.id),
            "lawyerAddress": request.lawyerAddress,
            "clientAddress": request.clientAddress,
            "escrowId": request.escrowId,
            "txHash": request.txHash,
            "amountUSDC": request.amountUSDC,
            "status": "FUNDED",
            "createdAt": datetime.utcnow(),
            "blockNumber": tx_receipt["blockNumber"],
            "gasUsed": tx_receipt["gasUsed"]
        }
        
        result = db.payments.insert_one(payment_record)
        
        # Step 3: Update case status
        db.cases.update_one(
            {"_id": ObjectId(request.caseId)},
            {
                "$set": {
                    "paymentStatus": "FUNDED",
                    "escrowId": request.escrowId,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        print(f"  ✓ Payment recorded in DB: {result.inserted_id}")
        
        return {
            "success": True,
            "paymentId": str(result.inserted_id),
            "status": "FUNDED",
            "message": "Payment verified and recorded"
        }
    
    except HTTPException:
        raise
    except Exception as err:
        print(f"[ERROR] Payment confirmation failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verification failed: {str(err)}"
        )


@router.get("/status/{payment_id}")
async def get_payment_status(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get payment status"""
    try:
        payment = db.payments.find_one({"_id": ObjectId(payment_id)})
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        return {
            "paymentId": str(payment["_id"]),
            "status": payment.get("status"),
            "escrowId": payment.get("escrowId"),
            "txHash": payment.get("txHash"),
            "amountUSDC": payment.get("amountUSDC"),
            "createdAt": payment.get("createdAt")
        }
    
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(err)
        )
```

---

## ✅ PHASE 10: TESTING CHECKLIST

### 10.1: Local Testing

- [ ] MetaMask installed and funded (test USDC on Mumbai)
- [ ] Backend running: `uvicorn main:app --reload`
- [ ] Frontend running: `npm run dev`
- [ ] Database connected

### 10.2: Wallet Connection Test

```bash
# In browser console (http://localhost:5173):
```

```javascript
// Test 1: Check MetaMask
window.ethereum // Should exist

// Test 2: Connect wallet
import { connectWallet } from "./src/services/blockchain-config.js"
const account = await connectWallet()
console.log(account) // Should log wallet address

// Test 3: Check balance
import { getUSDCBalance } from "./src/services/usdc.js"
const balance = await getUSDCBalance("0x0FA8781a83E46826621b3BC094Ea2A0212e71B23", account)
console.log(balance) // Should log USDC balance
```

### 10.3: Full Payment Flow Test

1. **Navigate to Payment page:**
   ```
   http://localhost:5173/payment?caseId=123&lawyerAddress=0x...&amountUSDC=100
   ```

2. **Connect wallet**

3. **Click "Pay with USDC"**

4. **Approve MetaMask popups:**
   - USDC approval
   - Escrow deposit
   - Funds transfer

5. **Verify:**
   - ✓ TX hash displayed
   - ✓ DB record created: `db.payments.findOne()`
   - ✓ Case status updated: `db.cases.findOne({_id: ObjectId("...connection details")})`
   - ✓ View on Polygonscan: https://mumbai.polygonscan.com/tx/[HASH]

### 10.4: Blockchain Explorer Verification

Visit: https://mumbai.polygonscan.com/

Search for:
- Your wallet address → Check transaction
- Contract address → Verify escrow creation event
- USDC token transfers

---

## 🐛 TROUBLESHOOTING

| Error | Solution |
|-------|----------|
| "MetaMask not installed" | Install MetaMask browser extension |
| "Wrong network" | Switch MetaMask to Polygon Mumbai (chainId: 80001) |
| "Insufficient balance" | Fund wallet with test USDC from faucet |
| "Transaction reverted" | Check contract address, USDC address, decimals |
| "Signer not available" | Ensure wallet is connected before transaction |
| "CORS error" | Backend CORS should include frontend origin |
| "DB not updated" | Check backend token auth, MongoDB connection |

---

## 📋 FINAL CHECKLIST

- [ ] Contract deployed & ABI saved
- [ ] Environment variables configured
- [ ] Blockchain config created & tested
- [ ] Wallet connection working
- [ ] USDC approval flow working
- [ ] Escrow creation working
- [ ] Payment page integrated
- [ ] Backend verification implemented
- [ ] Full flow tested end-to-end
- [ ] Polygonscan verification successful

---

## 🎯 Next Phase

Once testing is complete:
1. **Installment Flow** - Implement lawyer requests, client approvals, admin releases
2. **Admin Dashboard** - Monitor escrows, approve/reject installments
3. **Production Deploy** - Move to Polygon Mainnet
4. **Security Audit** - Have contract reviewed before mainnet

**Ready to start? Execute STEP 1 → 10 in order.** 🚀

