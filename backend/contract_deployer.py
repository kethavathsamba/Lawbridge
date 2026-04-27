"""
Blockchain contract deployment utilities
Handles automatic deployment of escrow contracts for each case
"""
import os
import json
import logging
from datetime import datetime
from typing import Dict, Optional

try:
    from web3 import Web3
except ImportError:
    Web3 = None

logger = logging.getLogger(__name__)

# Polygon Amoy RPC endpoint
AMOY_RPC_URL = "https://rpc-amoy.polygon.technology/"
AMOY_CHAIN_ID = 80002

# Contract bytecode and ABI (compiled from LawBridgeEscrow.sol)
CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "_lawyer", "type": "address"},
                   {"internalType": "address", "name": "_platformWallet", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": False,
        "inputs": [{"indexed": True, "internalType": "address", "name": "client", "type": "address"},
                   {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
                   {"indexed": False, "internalType": "uint256", "name": "depositCount", "type": "uint256"}],
        "name": "Deposited",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [{"indexed": True, "internalType": "address", "name": "lawyer", "type": "address"},
                   {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"}],
        "name": "Released",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "adminApprove",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "adminApproveAndRelease",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "amount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "client",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "claimApprovedFunds",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "depositCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getStatus",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"},
                   {"internalType": "bool", "name": "", "type": "bool"},
                   {"internalType": "bool", "name": "", "type": "bool"},
                   {"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "lawyer",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "platformWallet",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "refund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Contract bytecode (you'll need to get this from Remix after compilation)
# This is a placeholder - will be provided after compilation
CONTRACT_BYTECODE = os.getenv("CONTRACT_BYTECODE", "0x608060405234801561001057600080fd5b506040516104ff3d806104ff833981810160405281019061003291906102e1565b60008055600180546001600160a01b0319166001600160a01b0384161790558060028190555060006003556000600481905550505061030a565b600080fd5b600080fd5b600080fd5b6001600160a01b038116810361006f57600080fd5b50565b60008083601f84011261008457600080fd5b50813567ffffffffffffffff81111561009c57600080fd5b6020830191508360208260051b85010111156100b757600080fd5b9250929050565b6000806000604084860312156100d357600080fd5b83356100de8161005f565b9250602084013567ffffffffffffffff8111156100fa57600080fd5b61010686828701610072565b9497909650939450505050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61015f82610116565b810181811067ffffffffffffffff8211171561017a5761017961012f565b5b80604052505050565b600061018d610113565b905061019982826101566000565b919050565b600067ffffffffffffffff8211156101b9576101b861012f565b5b6101c282610116565b9050602081019050919050565b82818337600083830152505050565b60006101f16101ec8461019e565b610183565b90508281526020810184848401111561020957600080fd5b61021484828561.1cf565b509392505050565b600082601f83011261022d57600080fd5b815161023d8482602086016101de565b91505092915050565b600080600040848603121561025a57600080fd5b8351610265816101.5f565b925060208401516001600160a01b03811461027f57600080fd5b809150509250929050565b600073ffffffffffffffffffffffffffffffffffffffff821161.02ae57600080fd5b50565b60006102bc82610289565b9050919050565b6102cc816102b1565b81146102d757600080fd5b50565b6102e3816102c3565b81146102ee57600080fd5b50565b6000604082840312156102.f57600080fd5b6102ff604061017b565b90509291505056fea2646970667358221220")


class ContractDeployer:
    """Handles blockchain contract deployment"""

    def __init__(self):
        if not Web3:
            raise ImportError("web3 package not installed. Install with: pip install web3")
        
        self.w3 = Web3(Web3.HTTPProvider(AMOY_RPC_URL))
        if not self.w3.is_connected():
            logger.error("Failed to connect to Polygon Amoy RPC")
            raise ConnectionError("Cannot connect to Polygon Amoy network")

    def get_contract_abi(self) -> Dict:
        """Get contract ABI"""
        return CONTRACT_ABI

    def verify_addresses(self, lawyer_address: str, platform_address: str) -> bool:
        """Verify that addresses are valid Ethereum addresses"""
        try:
            if not Web3.is_address(lawyer_address):
                logger.error(f"Invalid lawyer address: {lawyer_address}")
                return False
            if not Web3.is_address(platform_address):
                logger.error(f"Invalid platform address: {platform_address}")
                return False
            return True
        except Exception as e:
            logger.error(f"Address verification error: {e}")
            return False

    def get_contract_code(self) -> str:
        """
        Get the contract bytecode.
        
        NOTE: This is a placeholder. To get the actual bytecode:
        1. Go to Remix: https://remix.ethereum.org/
        2. Compile LawBridgeEscrow.sol (Compiler 0.8.18)
        3. Under "Compilation Details", copy the "Bytecode" value
        4. Set as CONTRACT_BYTECODE env variable
        """
        if not CONTRACT_BYTECODE or CONTRACT_BYTECODE.startswith("0x608"):
            logger.warning("Using placeholder bytecode. Set CONTRACT_BYTECODE env variable with actual compiled bytecode.")
        return CONTRACT_BYTECODE

    def estimate_deployment_cost(self) -> Dict:
        """
        Estimate gas cost for deployment
        Returns gas price and estimated cost in POL
        """
        try:
            gas_price = self.w3.eth.gas_price
            # Typical deployment costs ~400,000 gas
            estimated_gas = 400000
            estimated_cost_wei = gas_price * estimated_gas
            estimated_cost_pol = self.w3.from_wei(estimated_cost_wei, 'ether')

            return {
                "gas_price_gwei": float(self.w3.from_wei(gas_price, 'gwei')),
                "estimated_gas": estimated_gas,
                "estimated_cost_pol": float(estimated_cost_pol),
                "network": "Polygon Amoy",
                "chain_id": AMOY_CHAIN_ID
            }
        except Exception as e:
            logger.error(f"Error estimating deployment cost: {e}")
            return {"error": str(e)}

    def generate_deployment_info(self, lawyer_address: str, platform_address: str) -> Dict:
        """
        Generate deployment information for manual Remix deployment
        This is useful until we have private key for automated deployment
        """
        if not self.verify_addresses(lawyer_address, platform_address):
            return {"error": "Invalid addresses"}

        cost_info = self.estimate_deployment_cost()

        return {
            "status": "READY_FOR_DEPLOYMENT",
            "network": "Polygon Amoy (ChainID: 80002)",
            "rpc_url": AMOY_RPC_URL,
            "constructor_args": {
                "_lawyer": Web3.to_checksum_address(lawyer_address),
                "_platformWallet": Web3.to_checksum_address(platform_address),
            },
            "contract_abi": self.get_contract_abi(),
            "deployment_instructions": {
                "step_1": "Go to https://remix.ethereum.org/",
                "step_2": "Create file: LawBridgeEscrow.sol",
                "step_3": "Paste contract code from blockchain/LawBridgeEscrow.sol",
                "step_4": "Compile with Solidity ^0.8.18",
                "step_5": "Select 'Injected Provider (MetaMask)' as environment",
                "step_6": f"Connect MetaMask with wallet that has ~{cost_info.get('estimated_cost_pol', 0.01)} POL",
                "step_7": "Deploy with above constructor arguments",
                "step_8": "Save the deployed contract address",
            },
            "cost_estimate": cost_info,
            "note": "Deployment must be done manually via Remix until automated deployment is configured"
        }


def get_deployer() -> Optional[ContractDeployer]:
    """Get a contract deployer instance"""
    try:
        return ContractDeployer()
    except Exception as e:
        logger.error(f"Failed to initialize deployer: {e}")
        return None


def create_deployment_instructions(case_id: str, lawyer_address: str, platform_address: str) -> Dict:
    """
    Generate deployment instructions for a case
    Called when a case is created
    """
    deployer = get_deployer()
    if not deployer:
        return {"error": "Blockchain service unavailable"}

    info = deployer.generate_deployment_info(lawyer_address, platform_address)
    info["case_id"] = case_id
    info["created_at"] = datetime.utcnow().isoformat()

    return info
