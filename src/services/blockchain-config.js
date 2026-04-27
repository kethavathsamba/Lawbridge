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
 * Get a provider that explicitly connects to Polygon Amoy RPC
 * This bypasses MetaMask for read-only operations
 */
export const getAmoyRpcProvider = () => {
    return new ethers.providers.JsonRpcProvider(
        "https://rpc-amoy.polygon.technology/"
    );
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
    try {
        if (!window.ethereum) {
            throw new Error("MetaMask not installed");
        }

        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        return accounts[0] || null;
    } catch (err) {
        console.error("Failed to get connected account:", err);
        throw err;
    }
};

/**
 * Switch network to Polygon Amoy (testnet)
 */
/**
 * Get current network chain ID from MetaMask
 */
export const getCurrentChainId = async () => {
    if (!window.ethereum) return null;
    
    try {
        const chainId = await window.ethereum.request({
            method: "eth_chainId"
        });
        return parseInt(chainId, 16);
    } catch (err) {
        console.error("Failed to get current chain ID:", err);
        return null;
    }
};

/**
 * Validate and switch to Polygon Amoy if needed
 */
export const ensureAmoyNetwork = async () => {
    const AMOY_CHAIN_ID = 80002;
    const currentChainId = await getCurrentChainId();
    
    console.log(`[Network] Current chain ID: ${currentChainId}, Required: ${AMOY_CHAIN_ID}`);
    
    if (currentChainId !== AMOY_CHAIN_ID) {
        console.log("[Network] Switching to Polygon Amoy...");
        await switchToAmoy();
        console.log("[Network] Switched to Polygon Amoy ✓");
    }
};

export const switchToAmoy = async () => {
    if (!window.ethereum) throw new Error("MetaMask not available");
    
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x13882" }] // 80002 in hex
        });
    } catch (err) {
        if (err.code === 4902) {
            // Network not added, add it
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                    {
                        chainId: "0x13882",
                        chainName: "Polygon Amoy",
                        rpcUrls: ["https://rpc-amoy.polygon.technology/"],
                        nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
                        blockExplorerUrls: ["https://amoy.polygonscan.com/"]
                    }
                ]
            });
        } else {
            throw err;
        }
    }
};
