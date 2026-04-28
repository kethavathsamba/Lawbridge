import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { depositToEscrow, checkWalletBalance } from "../services/blockchain";
import { convertINRtoPOL, formatCurrency, getExchangeRateInfo } from "../services/currencyConverter";
import "./Payment.css";

export default function Payment() {
    const location = useLocation();
    const navigate = useNavigate();
    const { caseId, lawyerAddress, amountUSDC } = location.state || {};

    // Convert INR to POL
    const amountPOL = convertINRtoPOL(parseFloat(amountUSDC));
    const gasBufferPOL = 0.0001; // 0.0001 POL buffer for gas fees
    const totalRequiredPOL = amountPOL + gasBufferPOL;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [connectedAccount, setConnectedAccount] = useState(null);
    const [showWalletInput, setShowWalletInput] = useState(false);
    const [manualWalletInput, setManualWalletInput] = useState("");

    useEffect(() => {
        checkWallet();
    }, []);

    const checkWallet = async () => {
        if (!window.ethereum) {
            console.log("MetaMask not detected");
            return;
        }

        try {
            const accounts = await window.ethereum.request({
                method: "eth_accounts"
            });

            if (accounts && accounts.length > 0) {
                console.log("Already connected:", accounts[0]);
                setConnectedAccount(accounts[0]);
                setWalletConnected(true);
            }
        } catch (err) {
            console.error("Error checking wallet:", err);
        }
    };

    const handlePayment = async () => {
        try {
            if (!caseId || !lawyerAddress || !amountUSDC) {
                setError("Missing payment details");
                return;
            }

            setLoading(true);
            setError(null);

            // If not connected, connect first
            if (!connectedAccount) {
                console.log("Not connected, connecting to MetaMask...");
                
                if (!window.ethereum) {
                    setError("MetaMask is not installed. Please install the extension.");
                    setLoading(false);
                    return;
                }

                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts"
                });

                if (!accounts || accounts.length === 0) {
                    setError("Failed to connect wallet");
                    setLoading(false);
                    return;
                }

                console.log("Connected to:", accounts[0]);
                setConnectedAccount(accounts[0]);
                setWalletConnected(true);
                
                // After connecting, check balance and proceed
                await checkBalanceAndPay(accounts[0]);
            } else {
                // Already connected, check balance and proceed
                await checkBalanceAndPay(connectedAccount);
            }
        } catch (err) {
            console.error("Payment error:", err);
            if (err.code === 4001) {
                setError("You cancelled the connection request");
            } else if (err.code === -32002) {
                setError("MetaMask connection request is already pending");
            } else {
                setError(err.message || "Payment failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const checkBalanceAndPay = async (account) => {
        try {
            console.log("Checking wallet balance...");
            
            const balanceCheck = await checkWalletBalance(account, totalRequiredPOL);

            if (!balanceCheck.hasEnoughFunds) {
                const shortfallAmount = (totalRequiredPOL - parseFloat(balanceCheck.balance)).toFixed(4);
                setError(
                    <div style={{ textAlign: "left" }}>
                        <strong>❌ Insufficient Funds</strong>
                        <p>Your wallet has <strong>{balanceCheck.balance} POL</strong></p>
                        <p style={{fontSize: "14px", color: "#666"}}>({formatCurrency(parseFloat(balanceCheck.balance) * 66.4, "INR")})</p>
                        <p>You need <strong>{totalRequiredPOL.toFixed(4)} POL</strong> for:</p>
                        <ul style={{fontSize: "13px", margin: "5px 0"}}>
                            <li>Payment: {formatCurrency(amountPOL, "POL")} ({formatCurrency(amountUSDC, "INR")})</li>
                            <li>Gas fees: ~{gasBufferPOL} POL (~₹66)</li>
                        </ul>
                        <p>You're short by <strong>{shortfallAmount} POL</strong> (~₹{Math.round(shortfallAmount * 66)})</p>
                        <button 
                            onClick={() => window.open("https://faucet.polygon.technology/", "_blank")}
                            style={{
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                marginTop: "10px",
                                fontSize: "14px",
                                fontWeight: "bold"
                            }}
                        >
                            💰 Get Test POL from Faucet
                        </button>
                        <p style={{ fontSize: "12px", marginTop: "10px", color: "#666" }}>
                            Click above to open the Polygon faucet in a new tab, then come back and try again.
                        </p>
                    </div>
                );
                setLoading(false);
                return;
            }

            console.log("Balance check passed. Processing payment...");
            await processPayment(account);
        } catch (err) {
            console.error("Error in checkBalanceAndPay:", err);
            setError(`❌ Error: ${err.message || "Payment failed"}`);
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        setConnectedAccount(null);
        setWalletConnected(false);
        setBalance(null);
        setError(null);
        setShowWalletInput(true);
        setManualWalletInput("");
    };

    const handleConnectManualWallet = () => {
        const walletAddress = manualWalletInput.trim();
        
        // Validate Ethereum address format
        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            setError("❌ Invalid wallet address. Please enter a valid Ethereum address (0x...)");
            return;
        }

        setConnectedAccount(walletAddress);
        setWalletConnected(true);
        setShowWalletInput(false);
        setError(null);
        console.log("Connected to manual wallet:", walletAddress);
    };

    const handleUseMetaMask = async () => {
        setLoading(true);
        try {
            if (!window.ethereum) {
                setError("MetaMask not installed. Please install it first.");
                setLoading(false);
                return;
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            if (accounts && accounts.length > 0) {
                setConnectedAccount(accounts[0]);
                setWalletConnected(true);
                setShowWalletInput(false);
                setError(null);
                console.log("Connected to MetaMask wallet:", accounts[0]);
            }
        } catch (err) {
            setError(`❌ Failed to connect MetaMask: ${err.message}`);
        }
        setLoading(false);
    };

    const processPayment = async (account) => {
        try {
            console.log("Processing payment with account:", account);
            console.log("Calling depositToEscrow...");

            const result = await depositToEscrow(lawyerAddress, amountPOL);
            console.log("Deposit successful, result:", result);

            const apiUrl = import.meta.env.VITE_API_URL;
            if (!apiUrl) {
                throw new Error("API URL not configured");
            }

            console.log("Confirming payment with backend...");
            const token = localStorage.getItem("lawbridge_token");
            if (!token) {
                throw new Error("Not authenticated. Please log in first.");
            }
            const response = await fetch(`${apiUrl}/payments/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    caseId: caseId,
                    escrowId: caseId, // Use caseId as escrowId (they're linked)
                    txHash: result.txHash,
                    amountUSDC: parseFloat(amountUSDC), // Rename from amountINR to amountUSDC
                    lawyerAddress: lawyerAddress,
                    clientAddress: account
                })
            });

            if (!response.ok) {
                // Try to get detailed error message from response
                let errorDetail = response.statusText;
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorData.message || response.statusText;
                    console.error("Backend error details:", errorData);
                } catch (parseErr) {
                    console.error("Could not parse error response:", parseErr);
                }
                throw new Error(`Backend error: ${errorDetail}`);
            }

            const data = await response.json();
            console.log("Payment confirmed by backend:", data);

            setSuccess(true);
            setTxHash(result.txHash);
            setLoading(false);
            console.log("Payment successful!");
        } catch (err) {
            console.error("Payment processing error:", err);
            setError(`❌ Payment failed: ${err.message}`);
            setLoading(false);
        }
    };

    if (!caseId) {
        return (
            <div className="payment-container">
                <div className="payment-card">
                    <div className="error-box">Missing case information</div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="payment-container">
                <div className="payment-card">
                    <div className="success-box">
                        <h2>✓ Payment Successful!</h2>
                        <p>Your payment has been secured in escrow on Polygon Amoy blockchain.</p>
                        <div style={{
                            background: "#f0f9ff",
                            padding: "15px",
                            borderRadius: "8px",
                            margin: "15px 0",
                            textAlign: "left",
                            border: "1px solid #0ea5e9"
                        }}>
                            <p style={{margin: "5px 0"}}><strong>Amount Paid:</strong></p>
                            <p style={{margin: "5px 0", fontSize: "16px"}}>{formatCurrency(amountUSDC, "INR")}</p>
                            <p style={{margin: "5px 0", fontSize: "14px", color: "#666"}}>({formatCurrency(amountPOL, "POL")})</p>
                        </div>
                        <a
                            href={`https://amoy.polygonscan.com/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-block",
                                background: "#3b82f6",
                                color: "white",
                                padding: "10px 20px",
                                borderRadius: "6px",
                                textDecoration: "none",
                                marginTop: "10px"
                            }}
                        >
                            🔍 View Transaction on Polygonscan
                        </a>
                        <button 
                            onClick={() => navigate("/client/cases")} 
                            className="btn-primary" 
                            style={{ marginTop: "1rem" }}
                        >
                            Back to Cases
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-container">
            <div className="payment-card">
                <h1>Blockchain Payment - POL Escrow</h1>

                {error && <div className="error-box">{error}</div>}

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
                        <span>Amount to Pay:</span>
                        <div className="value">
                            <div style={{fontSize: "16px", fontWeight: "bold"}}>
                                {formatCurrency(amountUSDC, "INR")}
                            </div>
                            <div style={{fontSize: "13px", color: "#666"}}>
                                ≈ {formatCurrency(amountPOL, "POL")}
                            </div>
                        </div>
                    </div>
                    <div className="info-row">
                        <span>Gas Fee (Est):</span>
                        <div className="value">
                            <div style={{fontSize: "14px"}}>~1 POL (~₹66)</div>
                        </div>
                    </div>
                    <div className="info-row">
                        <span>Total Required:</span>
                        <div className="value">
                            <div style={{fontSize: "14px", fontWeight: "bold"}}>
                                {formatCurrency(totalRequiredPOL, "POL")}
                            </div>
                        </div>
                    </div>
                    <div className="info-row">
                        <span>Your Wallet:</span>
                        <span className="value mono">
                            {connectedAccount 
                                ? `${connectedAccount.substring(0, 6)}...${connectedAccount.substring(38)}`
                                : "Not connected"}
                        </span>
                    </div>
                </div>

                {showWalletInput && !walletConnected ? (
                    <div style={{
                        background: "#f0f9ff",
                        padding: "20px",
                        borderRadius: "8px",
                        border: "1px solid #0ea5e9",
                        marginTop: "20px"
                    }}>
                        <h3 style={{marginTop: 0}}>Connect Wallet</h3>
                        <div style={{marginBottom: "15px"}}>
                            <label style={{display: "block", marginBottom: "8px", fontWeight: "bold"}}>
                                Enter Wallet Address:
                            </label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={manualWalletInput}
                                onChange={(e) => setManualWalletInput(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    boxSizing: "border-box"
                                }}
                            />
                            <p style={{fontSize: "12px", color: "#666", margin: "5px 0 0 0"}}>
                                Enter your Polygon Amoy wallet address
                            </p>
                        </div>
                        <div style={{display: "flex", gap: "10px", flexDirection: "column"}}>
                            <button
                                onClick={handleConnectManualWallet}
                                disabled={loading || !manualWalletInput.trim()}
                                style={{
                                    background: "#3b82f6",
                                    color: "white",
                                    border: "none",
                                    padding: "12px 20px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: "14px"
                                }}
                            >
                                ✓ Connect Manual Wallet
                            </button>
                            <button
                                onClick={handleUseMetaMask}
                                disabled={loading}
                                style={{
                                    background: "#f59e0b",
                                    color: "white",
                                    border: "none",
                                    padding: "12px 20px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: "14px"
                                }}
                            >
                                🦊 Connect via MetaMask
                            </button>
                        </div>
                    </div>
                ) : !walletConnected ? (
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="btn-primary btn-large"
                    >
                        {loading ? "Connecting & Processing..." : "Proceed to Pay"}
                    </button>
                ) : (
                    <div style={{display: "flex", gap: "10px", flexDirection: "column"}}>
                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            className="btn-primary btn-large"
                        >
                            {loading ? "Processing..." : "Proceed to Pay"}
                        </button>
                        <button
                            onClick={handleDisconnect}
                            disabled={loading}
                            style={{
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                padding: "12px 20px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "14px"
                            }}
                        >
                            🔄 Change Wallet
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
