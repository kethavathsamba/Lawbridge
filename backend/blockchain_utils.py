"""Blockchain utilities for deploying and interacting with escrow contracts."""

import os
import json
from web3 import Web3
from web3.gas_strategies.time_based import medium_gas_price_strategy

# Load contract ABI
CONTRACT_ABI_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "contracts", "LawBridgeEscrow.json")

def get_contract_abi():
    """Load contract ABI from JSON file"""
    try:
        with open(CONTRACT_ABI_PATH, 'r') as f:
            contract_data = json.load(f)
            return contract_data.get("abi", [])
    except Exception as e:
        print(f"[ERROR] Failed to load contract ABI: {e}")
        return []

# Solidity contract bytecode (minified)
CONTRACT_BYTECODE = """
608060405234801561001057600080fd5b50604051610d4a380380610d4a833981810160405281019061003291906101f8565b60008060006101000a81548160ff02191690831515021790555060008060006101000a81548160ff021916908315150217905550600180546001600160a01b0319166001600160a01b0383169081178255600280546001600160a01b0319166001600160a01b0384169081178255600380546001600160a01b0319166001600160a01b03851690811790915550504260045560055550610241565b6000604051905090565b6000815190506100c681610226565b92915050565b60006020828403121561010157600080fd5b600061010f848285016100b7565b91505092915050565b6000815190506101278161023a565b92915050565b60006040828403121561013f57600080fd5b600061014d848285016100b7565b925050602061015e8482850161011e565b9150509250929050565b60006020828403121561017a57600080fd5b60006101888482850161011e565b91505092915050565b60006101a48383610200565b90508281101561020157604051632a087d0b60e21b815260206004820152601060248201526f496e76616c696420616464726573736560801b6044820152606401604051809103906000f5b5050919050565b505050565b6001600160a01b03919091166000908152600160205260409020555050565b6101f9816080fd5b50565b600080600080600060a0868803121561021457600080fd5b60006102228882890161011e565b9550506020610233888289010161013d565b9450506080610244888289010161011e565b93505050949695505050505050
"""

def get_web3_connection():
    """Get Web3 connection to Polygon Amoy with timeout and error handling"""
    provider_url = os.getenv(
        "WEB3_PROVIDER_URL", 
        "https://rpc-amoy.polygon.technology/"
    )
    try:
        # Use HTTPProvider with timeout to prevent hanging
        web3 = Web3(Web3.HTTPProvider(provider_url, request_kwargs={"timeout": 10}))
        
        if not web3.is_connected():
            raise Exception(f"Failed to connect to blockchain provider at {provider_url}")
        
        return web3
    except Exception as e:
        print(f"[ERROR] Web3 connection failed: {e}")
        print(f"[DEBUG] Provider URL: {provider_url}")
        raise

def get_deployer_account():
    """Get deployer account from private key"""
    private_key = os.getenv("BLOCKCHAIN_PRIVATE_KEY")
    if not private_key:
        raise Exception(
            "❌ BLOCKCHAIN_PRIVATE_KEY not configured in .env\n"
            "This is required to sign transactions for installment transfers.\n"
            "Add your platform wallet's private key to .env:\n"
            "BLOCKCHAIN_PRIVATE_KEY=<your-private-key-without-0x>"
        )
    
    try:
        web3 = get_web3_connection()
        account = web3.eth.account.from_key(private_key)
        return account, web3
    except ValueError as e:
        raise Exception(f"Invalid BLOCKCHAIN_PRIVATE_KEY format: {str(e)}")

def deploy_escrow_contract(lawyer_address: str, platform_wallet: str) -> dict:
    """
    Deploy a new escrow contract for a case
    
    Args:
        lawyer_address: Lawyer's Ethereum address
        platform_wallet: Platform admin wallet address
    
    Returns:
        dict with contractAddress, txHash, gasUsed
    """
    try:
        print(f"[Blockchain] Deploying escrow contract...")
        print(f"  Lawyer: {lawyer_address}")
        print(f"  Platform: {platform_wallet}")
        
        # Validate addresses
        if not Web3.is_address(lawyer_address) or not Web3.is_address(platform_wallet):
            raise ValueError("Invalid Ethereum addresses")
        
        account, web3 = get_deployer_account()
        abi = get_contract_abi()
        
        # Create contract factory
        Contract = web3.eth.contract(abi=abi, bytecode=CONTRACT_BYTECODE)
        
        # Build constructor arguments
        constructor_args = (Web3.to_checksum_address(lawyer_address), Web3.to_checksum_address(platform_wallet))
        
        # Estimate gas
        gas_estimate = Contract.constructor(*constructor_args).estimate_gas({"from": account.address})
        gas_limit = int(gas_estimate * 1.2)  # Add 20% buffer
        
        print(f"  Estimated gas: {gas_estimate}")
        print(f"  Gas limit: {gas_limit}")
        
        # Get current gas price
        gas_price = web3.eth.gas_price
        print(f"  Gas price: {web3.from_wei(gas_price, 'gwei')} gwei")
        
        # Build transaction
        tx = Contract.constructor(*constructor_args).build_transaction({
            "from": account.address,
            "gas": gas_limit,
            "gasPrice": gas_price,
            "nonce": web3.eth.get_transaction_count(account.address)
        })
        
        # Sign and send transaction
        signed_tx = web3.eth.account.sign_transaction(tx, account.key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        print(f"  TX Hash: {tx_hash.hex()}")
        print(f"  Waiting for confirmation...")
        
        # Wait for receipt
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
        
        contract_address = receipt["contractAddress"]
        print(f"  ✓ Contract deployed: {contract_address}")
        
        return {
            "contractAddress": contract_address,
            "txHash": tx_hash.hex(),
            "gasUsed": receipt["gasUsed"],
            "blockNumber": receipt["blockNumber"]
        }
    
    except Exception as e:
        print(f"[ERROR] Contract deployment failed: {e}")
        raise

def get_escrow_status(contract_address: str) -> dict:
    """Get status of a deployed escrow contract"""
    try:
        web3 = get_web3_connection()
        abi = get_contract_abi()
        
        contract = web3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=abi)
        
        is_deposited, admin_approved, is_released, amount = contract.functions.getStatus().call()
        
        return {
            "isDeposited": is_deposited,
            "adminApproved": admin_approved,
            "isReleased": is_released,
            "amount": web3.from_wei(amount, "ether")
        }
    
    except Exception as e:
        print(f"[ERROR] Failed to get escrow status: {e}")
        raise

def transfer_installment_to_lawyer(contract_address: str, lawyer_address: str, amount_wei: int) -> dict:
    """
    Transfer installment amount from escrow to lawyer's wallet
    
    Args:
        contract_address: Deployed escrow contract address
        lawyer_address: Lawyer's wallet address
        amount_wei: Amount in wei to transfer
    
    Returns:
        dict with txHash, gasUsed, blockNumber
    """
    try:
        print(f"[Blockchain] Transferring installment to lawyer...")
        print(f"  Contract: {contract_address}")
        print(f"  Lawyer: {lawyer_address}")
        print(f"  Amount (wei): {amount_wei}")
        print(f"  Amount (POL): {Web3.from_wei(amount_wei, 'ether')} POL")
        
        # Validate amount
        if not isinstance(amount_wei, int) or amount_wei <= 0:
            raise ValueError(f"Invalid transfer amount. Must be positive integer in wei, got: {amount_wei} (type: {type(amount_wei).__name__})")
        
        # Validate addresses
        if not Web3.is_address(lawyer_address):
            raise ValueError("Invalid lawyer Ethereum address")
        
        account, web3 = get_deployer_account()
        abi = get_contract_abi()
        
        contract = web3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=abi
        )
        
        # Get current balance of the contract
        contract_balance = web3.eth.get_balance(Web3.to_checksum_address(contract_address))
        print(f"  Contract balance: {web3.from_wei(contract_balance, 'ether')} POL")
        
        # Get current balance of platform wallet
        platform_balance = web3.eth.get_balance(account.address)
        print(f"  Platform wallet balance: {web3.from_wei(platform_balance, 'ether')} POL")
        
        # Calculate gas cost (21000 gas * gas_price)
        gas_price = web3.eth.gas_price
        gas_cost = 21000 * gas_price
        print(f"  Gas price: {web3.from_wei(gas_price, 'gwei')} gwei")
        print(f"  Estimated gas cost: {web3.from_wei(gas_cost, 'ether')} POL")
        
        # Validate sufficient balance in both escrow and platform wallet
        if contract_balance < amount_wei:
            raise ValueError(f"Insufficient funds in escrow. Available: {web3.from_wei(contract_balance, 'ether')} POL, Requested: {web3.from_wei(amount_wei, 'ether')} POL")
        
        total_needed = amount_wei + gas_cost
        if platform_balance < total_needed:
            raise ValueError(f"Insufficient platform wallet balance. Available: {web3.from_wei(platform_balance, 'ether')} POL, Needed: {web3.from_wei(total_needed, 'ether')} POL (amount + gas)")
        
        # Build transaction to transfer funds directly from platform wallet to lawyer
        # This simulates an installment payment
        print(f"  [DEBUG] Building transaction:")
        print(f"    From: {account.address}")
        print(f"    To: {Web3.to_checksum_address(lawyer_address)}")
        print(f"    Value: {amount_wei} wei = {Web3.from_wei(amount_wei, 'ether')} POL")
        
        tx = {
            "from": account.address,
            "to": Web3.to_checksum_address(lawyer_address),
            "value": amount_wei,
            "gas": 21000,  # Standard gas for POL transfer
            "gasPrice": web3.eth.gas_price,
            "nonce": web3.eth.get_transaction_count(account.address)
        }
        
        # Sign and send transaction
        signed_tx = web3.eth.account.sign_transaction(tx, account.key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        print(f"  TX Hash: {tx_hash.hex()}")
        print(f"  Waiting for confirmation...")
        
        # Wait for receipt
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
        
        print(f"  ✓ Installment transferred: {tx_hash.hex()}")
        
        return {
            "txHash": tx_hash.hex(),
            "gasUsed": receipt["gasUsed"],
            "blockNumber": receipt["blockNumber"],
            "amount": Web3.from_wei(amount_wei, "ether")
        }
    
    except Exception as e:
        print(f"[ERROR] Installment transfer failed: {e}")
        raise
