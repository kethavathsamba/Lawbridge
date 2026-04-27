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
            const result = await createEscrowAndDeposit(
                lawyerAddress,
                amountUSDC,
                caseId,
                import.meta.env.VITE_USDC_ADDRESS
            );

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

            setSuccess(true);
            setTxHash(result.txHash);
        } catch (err) {
            console.error("=== PAYMENT FAILED ===", err);
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
