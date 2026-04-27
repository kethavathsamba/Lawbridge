import { ethers } from "ethers";
import { getEscrowContract, CONTRACT_ADDRESS, getConnectedAccount, getAmoyRpcProvider, ensureAmoyNetwork } from "./blockchain-config";

/**
 * Deposit funds into escrow (Client deposits payment)
 * 
 * @param {string} lawyerAddress - Lawyer's wallet address
 * @param {string|number} amountETH - Amount in ETH (for testing with native currency)
 * @returns {Promise<{txHash: string, amount: string}>}
 */
export const depositToEscrow = async (lawyerAddress, amountETH) => {
    try {
        console.log(`[Escrow] Starting deposit...`);
        console.log(`  - Lawyer: ${lawyerAddress}`);
        console.log(`  - Amount: ${amountETH} ETH`);
        console.log(`  - Contract: ${CONTRACT_ADDRESS}`);

        // Ensure MetaMask is on the correct network
        await ensureAmoyNetwork();

        const escrow = await getEscrowContract();
        const clientAddress = await getConnectedAccount();
        
        // Round to 8 decimal places to avoid parseEther errors
        const roundedAmount = Math.round(parseFloat(amountETH) * 1e8) / 1e8;
        const amountInWei = ethers.utils.parseEther(roundedAmount.toString());

        console.log("[Step 1/1] Depositing funds to escrow...");
        console.log(`  - Amount in Wei: ${amountInWei.toString()}`);

        // Try deposit with gas estimation fallback
        let tx;
        try {
            tx = await escrow.deposit({
                value: amountInWei
            });
        } catch (gasErr) {
            console.warn("[WARN] Gas estimation failed, trying with manual gas limit...", gasErr.code);
            
            // If gas estimation fails, provide manual gas limit
            if (gasErr.code === "UNPREDICTABLE_GAS_LIMIT") {
                console.log("[INFO] Using fallback gas limit (500000)");
                tx = await escrow.deposit(
                    { value: amountInWei },
                    { gasLimit: 500000 }
                );
            } else {
                throw gasErr;
            }
        }
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");

        console.log("[SUCCESS] Funds deposited to escrow!");

        return {
            txHash: receipt.transactionHash,
            amount: amountETH,
            client: clientAddress,
            lawyer: lawyerAddress
        };
    } catch (err) {
        console.error("[ERROR] Deposit failed:", err);
        
        // Provide more helpful error messages
        if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
            console.error("[ERROR_DETAIL] The contract call would revert. Possible causes:");
            console.error("  1. Contract not deployed at specified address");
            console.error("  2. Contract state issue (e.g., already deposited)");
            console.error("  3. Constructor not called with valid lawyer/platform addresses");
        }
        
        throw err;
    }
};

/**
 * Admin approves case completion and automatically releases payment to lawyer
 * This is called by backend admin endpoint when conditions are met
 * 
 * @returns {Promise<string>} Transaction hash
 */
export const adminApproveAndRelease = async () => {
    try {
        console.log(`[Escrow] Admin approving and releasing payment...`);
        
        // Ensure MetaMask is on the correct network
        await ensureAmoyNetwork();
        
        const escrow = await getEscrowContract();
        const tx = await escrow.adminApproveAndRelease();
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");
        console.log("[SUCCESS] Payment automatically released to lawyer!");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Admin approval and release failed:", err);
        throw err;
    }
};

/**
 * Admin approves the case (first step)
 * Lawyer can then claim funds using claimApprovedFunds()
 * 
 * @returns {Promise<string>} Transaction hash
 */
export const adminApproveRelease = async () => {
    try {
        console.log(`[Escrow] Admin approving case...`);
        
        // Ensure MetaMask is on the correct network
        await ensureAmoyNetwork();
        
        const escrow = await getEscrowContract();
        const tx = await escrow.adminApprove();
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");
        console.log("[SUCCESS] Case approved by admin!");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Admin approval failed:", err);
        throw err;
    }
};

/**
 * Lawyer claims approved funds (second step)
 * Can only be called after admin has approved
 * 
 * @returns {Promise<string>} Transaction hash
 */
export const lawyerClaimApprovedFunds = async () => {
    try {
        console.log(`[Escrow] Lawyer claiming approved funds...`);
        
        // Ensure MetaMask is on the correct network
        await ensureAmoyNetwork();
        
        const escrow = await getEscrowContract();
        const tx = await escrow.claimApprovedFunds();
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");
        console.log("[SUCCESS] Funds claimed by lawyer!");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Lawyer claim failed:", err);
        throw err;
    }
};

/**
 * Release payment from escrow to lawyer (DEPRECATED - use adminApproveAndRelease)
 * 
 * @returns {Promise<string>} Transaction hash
 */
export const releasePaymentFromEscrow = async () => {
    try {
        console.log(`[Escrow] Releasing payment from escrow...`);
        
        // Ensure MetaMask is on the correct network
        await ensureAmoyNetwork();
        
        const escrow = await getEscrowContract();
        // Use the new admin function
        const tx = await escrow.adminApproveAndRelease();
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Payment release failed:", err);
        throw err;
    }
};

/**
 * Refund escrow funds back to client
 * 
 * @returns {Promise<string>} Transaction hash
 */
export const refundEscrow = async () => {
    try {
        console.log(`[Escrow] Refunding escrow funds...`);
        
        // Ensure MetaMask is on the correct network
        await ensureAmoyNetwork();
        
        const escrow = await getEscrowContract();
        const tx = await escrow.refund();
        
        console.log("  - TX Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("  - Confirmed ✓");

        return receipt.transactionHash;
    } catch (err) {
        console.error("[ERROR] Refund failed:", err);
        throw err;
    }
};

/**
 * Get current escrow status
 * 
 * @returns {Promise<{client: string, lawyer: string, amount: string, isDeposited: boolean, isReleased: boolean}>}
 */
export const getEscrowStatus = async () => {
    try {
        console.log(`[Escrow] Fetching escrow status...`);
        
        const escrow = await getEscrowContract();
        
        const client = await escrow.client();
        const lawyer = await escrow.lawyer();
        const amount = await escrow.amount();
        const isDeposited = await escrow.isDeposited();
        const isReleased = await escrow.isReleased();

        console.log("  - Status retrieved ✓");

        return {
            client,
            lawyer,
            amount: ethers.utils.formatEther(amount),
            isDeposited,
            isReleased
        };
    } catch (err) {
        console.error("[ERROR] Failed to fetch escrow status:", err);
        throw err;
    }
};

/**
 * Check wallet balance
 * 
 * @param {string} account - Wallet address to check
 * @returns {Promise<{balance: string, balanceInWei: string, hasEnoughFunds: boolean}>}
 */
export const checkWalletBalance = async (account, requiredAmount) => {
    try {
        // Use public Polygon Amoy RPC for reliable balance checks
        // This bypasses MetaMask and ensures we're always on the correct network
        const provider = getAmoyRpcProvider();
        const balanceInWei = await provider.getBalance(account);
        const balance = ethers.utils.formatEther(balanceInWei);
        
        // Round to 8 decimal places to avoid parseEther errors with floating-point precision
        const roundedAmount = Math.round(parseFloat(requiredAmount) * 1e8) / 1e8;
        const requiredAmountWei = ethers.utils.parseEther(roundedAmount.toString());
        const hasEnoughFunds = balanceInWei.gte(requiredAmountWei);

        console.log(`[Balance Check]`);
        console.log(`  - Account: ${account}`);
        console.log(`  - Balance: ${balance} POL`);
        console.log(`  - Required: ${roundedAmount} POL`);
        console.log(`  - Has enough: ${hasEnoughFunds}`);

        return {
            balance,
            balanceInWei: balanceInWei.toString(),
            hasEnoughFunds
        };
    } catch (err) {
        console.error("[ERROR] Failed to check wallet balance:", err);
        throw err;
    }
};
