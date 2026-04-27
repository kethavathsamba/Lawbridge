import React, { useState, useEffect } from "react";
import { getConnectedAccount, switchToAmoy } from "../services/blockchain-config";
import { getUSDCBalance } from "../services/usdc";
import "./WalletConnector.css";

export const WalletConnector = ({ onConnect }) => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        // Check if wallet already connected
        checkConnection();
        
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", handleAccountChange);
            window.ethereum.on("chainChanged", () => window.location.reload());
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener("accountsChanged", handleAccountChange);
            }
        };
    }, []);

    const checkConnection = async () => {
        try {
            const acc = await getConnectedAccount();
            if (acc) {
                setAccount(acc);
                // Try to get balance
                try {
                    const bal = await getUSDCBalance(
                        import.meta.env.VITE_USDC_ADDRESS,
                        acc
                    );
                    setBalance(bal);
                } catch (err) {
                    console.warn("Could not fetch balance:", err);
                }
                onConnect?.(acc);
            }
        } catch (err) {
            console.error("Connection check failed:", err);
        }
    };

    const handleAccountChange = (accounts) => {
        if (accounts.length === 0) {
            setAccount(null);
            setBalance(null);
            setError("Wallet disconnected");
        } else {
            setAccount(accounts[0]);
            onConnect?.(accounts[0]);
        }
    };

    const connectWallet = async () => {
        setLoading(true);
        setError(null);

        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error("MetaMask not installed. Please install it first.");
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            const acc = accounts[0];
            setAccount(acc);
            onConnect?.(acc);

            // Try to get balance
            try {
                const bal = await getUSDCBalance(
                    import.meta.env.VITE_USDC_ADDRESS,
                    acc
                );
                setBalance(bal);
            } catch (err) {
                console.warn("Could not fetch balance:", err);
            }

            // Optionally switch to Amoy network
            try {
                await switchToAmoy();
            } catch (networkErr) {
                console.warn("Network switch failed (non-critical):", networkErr);
            }
        } catch (err) {
            setError(err.message || "Failed to connect wallet");
            console.error("Wallet connection failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const disconnectWallet = async () => {
        setAccount(null);
        setBalance(null);
        setError(null);
        // Note: MetaMask doesn't have a disconnect RPC method
        // This just clears local state
    };

    return (
        <div className="wallet-connector">
            {account ? (
                <div className="connected">
                    <span className="address">
                        {account.substring(0, 6)}...{account.substring(38)}
                    </span>
                    {balance && <span className="balance">{parseFloat(balance).toFixed(2)} USDC</span>}
                    <button onClick={disconnectWallet} className="disconnect-btn">
                        Disconnect
                    </button>
                </div>
            ) : (
                <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="connect-btn"
                >
                    {loading ? "Connecting..." : "Connect Wallet"}
                </button>
            )}
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export const connectWallet = async () => {
    if (!window.ethereum) {
        throw new Error("MetaMask not installed");
    }

    const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
    });

    return accounts[0];
};

            <p>
              🪙 <strong>Need testnet USDC?</strong> Go to{" "}
              <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer">
                Polygon Faucet
              </a>{" "}
              to get free test tokens
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connector connected">
      <div className="wallet-status">
        <div className="wallet-info-item">
          <span className="label">Connected Wallet:</span>
          <span className="value">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>

        <div className="wallet-info-item">
          <span className="label">USDC Balance:</span>
          <span className="value">{parseFloat(balance).toFixed(2)} USDC</span>
        </div>

        {network && (
          <div className="wallet-info-item">
            <span className="label">Network:</span>
            <span className="badge">{network.name}</span>
          </div>
        )}

        <button className="wallet-disconnect-btn" onClick={disconnectWallet}>
          Disconnect
        </button>
      </div>

      {network && (
        <div className="network-explorer">
          <a
            href={`${network.blockExplorer}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-link"
          >
            View on Block Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
