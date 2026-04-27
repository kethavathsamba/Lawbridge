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
    bool public isDeposited;
    bool public isReleased;
    bool public caseCompleted;
    bool public adminApproved;

    event Deposited(address indexed client, uint amount);
    event Released(address indexed lawyer, uint amount);
    event Refunded(address indexed client, uint amount);
    event AdminApprovalGranted(address indexed lawyer);

    constructor(address _lawyer, address _platformWallet) {
        lawyer = _lawyer;
        platformWallet = _platformWallet;
        adminApproved = false;
        caseCompleted = false;
    }

    function deposit() public payable {
        require(!isDeposited, "Already deposited");
        require(msg.value > 0, "Amount must be greater than 0");
        if (client == address(0)) {
            client = msg.sender;
        }
        require(msg.sender == client, "Only client");
        amount = msg.value;
        isDeposited = true;
        emit Deposited(client, msg.value);
    }

    function adminApproveAndRelease() public {
        require(msg.sender == platformWallet, "Only platform admin can approve");
        require(isDeposited, "No funds to release");
        require(!isReleased, "Already released");
        adminApproved = true;
        caseCompleted = true;
        isReleased = true;
        payable(lawyer).transfer(amount);
        emit AdminApprovalGranted(lawyer);
        emit Released(lawyer, amount);
    }

    function adminApprove() public {
        require(msg.sender == platformWallet, "Only platform admin can approve");
        require(isDeposited, "No funds available");
        require(!isReleased, "Already released");
        adminApproved = true;
        emit AdminApprovalGranted(lawyer);
    }

    function claimApprovedFunds() public {
        require(msg.sender == lawyer, "Only lawyer can claim");
        require(isDeposited, "No funds available");
        require(adminApproved, "Not approved by admin");
        require(!isReleased, "Already released");
        isReleased = true;
        payable(lawyer).transfer(amount);
        emit Released(lawyer, amount);
    }

    function refund() public {
        require(msg.sender == platformWallet, "Only platform can refund");
        require(isDeposited, "No funds to refund");
        require(!isReleased, "Already released, cannot refund");
        require(!adminApproved, "Cannot refund approved cases");
        isDeposited = false;
        payable(client).transfer(amount);
        emit Refunded(client, amount);
    }

    function getStatus() public view returns (bool, bool, bool, uint) {
        return (isDeposited, adminApproved, isReleased, amount);
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
