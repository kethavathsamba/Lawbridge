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
