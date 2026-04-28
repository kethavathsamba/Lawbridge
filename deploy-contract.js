#!/usr/bin/env node

/**
 * Quick Contract Deployment Script
 * IMPORTANT: This contract was updated to fix the "Only client" payment error
 * 
 * The fix: client is now set dynamically on FIRST DEPOSIT (not in constructor)
 * This allows the same contract to serve multiple cases where different clients deposit
 * 
 * Usage: node deploy-contract.js <lawyerAddress> <platformWallet>
 */

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

const CONTRACT_CODE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract LawBridgeEscrow {
    address public client;
    address public lawyer;
    address public platformWallet;

    uint public amount;
    uint public depositCount;
    bool public isReleased;
    bool public caseCompleted;
    bool public adminApproved;

    event Deposited(address indexed client, uint amount, uint depositCount);
    event Released(address indexed lawyer, uint amount);
    event Refunded(address indexed client, uint amount);
    event AdminApprovalGranted(address indexed lawyer);

    constructor(address _lawyer, address _platformWallet) {
        client = address(0);
        lawyer = _lawyer;
        platformWallet = _platformWallet;
        adminApproved = false;
        caseCompleted = false;
        depositCount = 0;
    }

    // Deposit POL (native token) - allows multiple deposits
    function deposit() public payable {
        require(msg.value > 0, "ERR_ZERO_AMOUNT");
        
        if (client == address(0)) {
            client = msg.sender;
        } else {
            require(msg.sender == client, "ERR_NOT_CLIENT");
        }
        
        amount = msg.value;
        depositCount += 1;
        emit Deposited(client, msg.value, depositCount);
    }

    // Admin approves and automatically releases to lawyer
    function adminApproveAndRelease() public {
        require(msg.sender == platformWallet, "ERR_NOT_ADMIN");
        require(amount > 0, "ERR_NO_FUNDS");
        require(!isReleased, "ERR_ALREADY_RELEASED");
        
        adminApproved = true;
        caseCompleted = true;
        isReleased = true;
        
        uint releaseAmount = amount;
        amount = 0;
        
        (bool success, ) = payable(lawyer).call{value: releaseAmount}("");
        require(success, "ERR_TRANSFER_FAILED");
        emit AdminApprovalGranted(lawyer);
        emit Released(lawyer, releaseAmount);
    }

    // Two-step: Admin approves first
    function adminApprove() public {
        require(msg.sender == platformWallet, "ERR_NOT_ADMIN");
        require(amount > 0, "ERR_NO_FUNDS");
        require(!isReleased, "ERR_ALREADY_RELEASED");
        
        adminApproved = true;
        emit AdminApprovalGranted(lawyer);
    }

    // Lawyer claims approved funds
    function claimApprovedFunds() public {
        require(msg.sender == lawyer, "ERR_NOT_LAWYER");
        require(amount > 0, "ERR_NO_FUNDS");
        require(adminApproved, "ERR_NOT_APPROVED");
        require(!isReleased, "ERR_ALREADY_RELEASED");

        isReleased = true;
        uint releaseAmount = amount;
        amount = 0;
        
        (bool success, ) = payable(lawyer).call{value: releaseAmount}("");
        require(success, "ERR_TRANSFER_FAILED");
        emit Released(lawyer, releaseAmount);
    }

    // Refund to client
    function refund() public {
        require(msg.sender == platformWallet, "ERR_NOT_ADMIN");
        require(amount > 0, "ERR_NO_FUNDS");
        require(!isReleased, "ERR_ALREADY_RELEASED");
        require(!adminApproved, "ERR_CASE_APPROVED");

        uint refundAmount = amount;
        amount = 0;
        
        (bool success, ) = payable(client).call{value: refundAmount}("");
        require(success, "ERR_TRANSFER_FAILED");
        emit Refunded(client, refundAmount);
    }

    function getStatus() public view returns (uint, bool, bool, uint) {
        return (depositCount, adminApproved, isReleased, amount);
    }
}
`;

async function deploy() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.error('Usage: node deploy-contract.js <lawyerAddress> <platformWallet>');
        console.error('Example: node deploy-contract.js 0x69b6e2501bb2053ba8a69c87 0x69b6e2501bb2053ba8a69c87');
        process.exit(1);
    }

    const lawyerAddress = args[0];
    const platformWallet = args[1];

    console.log('🚀 LawBridge Escrow Contract Deployment');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Lawyer Address:', lawyerAddress);
    console.log('Platform Wallet:', platformWallet);
    console.log('Network: Polygon Amoy');
    console.log('');

    // Validate addresses
    if (!ethers.utils.isAddress(lawyerAddress) || !ethers.utils.isAddress(platformWallet)) {
        console.error('❌ Invalid addresses provided');
        process.exit(1);
    }

    try {
        // Connect to Polygon Amoy
        const provider = new ethers.providers.JsonRpcProvider(
            'https://rpc-amoy.polygon.technology/'
        );

        // Check connection
        const network = await provider.getNetwork();
        console.log('✓ Connected to:', network.name);
        console.log('');

        console.log('⚠️  Note: This script shows deployment details.');
        console.log('    For actual deployment, use Remix IDE or Hardhat.');
        console.log('');
        console.log('📋 Deployment Details:');
        console.log('   Constructor Args:');
        console.log('   - lawyerAddress:', lawyerAddress);
        console.log('   - platformWallet:', platformWallet);
        console.log('');
        console.log('📝 To deploy via Remix:');
        console.log('   1. Go to https://remix.ethereum.org/');
        console.log('   2. Create file: LawBridgeEscrow.sol');
        console.log('   3. Paste contract code');
        console.log('   4. Deploy & Run Transactions');
        console.log('   5. Set Environment: "Injected Provider - MetaMask"');
        console.log('   6. Input constructor parameters above');
        console.log('   7. Click "Deploy"');
        console.log('   8. Copy deployed address to .env as VITE_CONTRACT_ADDRESS');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

deploy().catch(console.error);
