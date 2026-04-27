// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract LawBridgeEscrow {

    address public client;
    address public lawyer;
    address public platformWallet;

    uint public amount;
    uint public depositCount;  // Track number of deposits
    bool public isReleased;
    bool public caseCompleted;
    
    // Approval tracking
    bool public adminApproved;

    event Deposited(address indexed client, uint amount, uint depositCount);
    event Released(address indexed lawyer, uint amount);
    event Refunded(address indexed client, uint amount);
    event AdminApprovalGranted(address indexed lawyer);

    constructor(address _lawyer, address _platformWallet) {
        // Do NOT set client here - it will be set on first deposit
        client = address(0);
        lawyer = _lawyer;
        platformWallet = _platformWallet;
        adminApproved = false;
        caseCompleted = false;
        depositCount = 0;
    }

    // Deposit POL (native token)
    // CHANGED: Removed 'isDeposited' check to allow multiple deposits/updates
    function deposit() public payable {
        require(msg.value > 0, "ERR_ZERO_AMOUNT");

        // Dynamically assign client on first deposit (first caller becomes the client)
        if (client == address(0)) {
            client = msg.sender;
        } else {
            // Only the assigned client can make deposits
            require(msg.sender == client, "ERR_NOT_CLIENT");
        }

        amount = msg.value;
        depositCount += 1;
        emit Deposited(client, msg.value, depositCount);
    }

    // Admin approves case completion and releases payment
    function adminApproveAndRelease() public {
        require(msg.sender == platformWallet, "ERR_NOT_ADMIN");
        require(amount > 0, "ERR_NO_FUNDS");
        require(!isReleased, "ERR_ALREADY_RELEASED");
        
        adminApproved = true;
        caseCompleted = true;
        isReleased = true;
        
        uint releaseAmount = amount;
        amount = 0;  // Clear amount to prevent re-entrancy
        
        // Automatically transfer to lawyer when conditions met
        (bool success, ) = payable(lawyer).call{value: releaseAmount}("");
        require(success, "ERR_TRANSFER_FAILED");
        emit AdminApprovalGranted(lawyer);
        emit Released(lawyer, releaseAmount);
    }

    // Alternative: Two-step process (admin approves, then lawyer or system claims)
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
        amount = 0;  // Clear amount to prevent re-entrancy
        
        (bool success, ) = payable(lawyer).call{value: releaseAmount}("");
        require(success, "ERR_TRANSFER_FAILED");
        emit Released(lawyer, releaseAmount);
    }

    // Refund to client (only if case is not approved/released)
    function refund() public {
        require(msg.sender == platformWallet, "ERR_NOT_ADMIN");
        require(amount > 0, "ERR_NO_FUNDS");
        require(!isReleased, "ERR_ALREADY_RELEASED");
        require(!adminApproved, "ERR_CASE_APPROVED");

        uint refundAmount = amount;
        amount = 0;  // Clear amount to prevent re-entrancy
        
        (bool success, ) = payable(client).call{value: refundAmount}("");
        require(success, "ERR_TRANSFER_FAILED");
        emit Refunded(client, refundAmount);
    }

    // View functions
    function getStatus() public view returns (uint, bool, bool, uint) {
        return (depositCount, adminApproved, isReleased, amount);
    }
}