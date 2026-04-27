import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const WalletSettings = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [savedAddress, setSavedAddress] = useState(user?.walletAddress || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check if MetaMask is already connected
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setConnected(true);
        await fetchBalance(accounts[0]);
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install it from https://metamask.io');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setConnected(true);
        setSuccess('✅ Wallet connected successfully!');
        await fetchBalance(accounts[0]);
      }
    } catch (err) {
      if (err.code === 4001) {
        setError('Connection rejected by user');
      } else {
        setError('Failed to connect wallet: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async (walletAddress) => {
    try {
      if (!window.ethereum) return;

      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [walletAddress, 'latest'],
      });

      // Convert from Wei to POL (divide by 10^18)
      const balanceInPOL = parseInt(balance, 16) / 1e18;
      setBalance(balanceInPOL.toFixed(4));
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const saveWalletAddress = async () => {
    if (!account) {
      setError('Please connect wallet first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { api } = await import('../services/api');
      
      await api.auth.updateWallet({
        walletAddress: account,
      });

      setSavedAddress(account);
      setSuccess('✅ Wallet address saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error saving wallet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setConnected(false);
    setBalance(null);
    setError(null);
  };

  return (
    <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        🔗 Blockchain Wallet
      </h3>
      <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
        Connect your MetaMask wallet for secure payments
      </p>

      {error && (
        <div
          style={{
            background: '#fee',
            color: '#c33',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          ❌ {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#efe',
            color: '#3a3',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {success}
        </div>
      )}

      {!connected ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          style={{
            background: '#f6851b',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            width: '100%',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '⏳ Connecting...' : '🦊 Connect MetaMask Wallet'}
        </button>
      ) : (
        <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>
              Connected Wallet Address
            </label>
            <input
              className="form-input"
              type="text"
              value={account}
              disabled
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          {balance && (
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>
                Wallet Balance
              </label>
              <input
                className="form-input"
                type="text"
                value={`${balance} POL`}
                disabled
                style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#3b82f6' }}
              />
              <p
                className="text-secondary"
                style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}
              >
                Low balance? Get test POL from{' '}
                <a
                  href="https://faucet.polygon.technology/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                >
                  Polygon Faucet
                </a>
              </p>
            </div>
          )}

          {savedAddress === account ? (
            <div style={{ color: '#3a3', fontSize: '0.9rem', marginBottom: '1rem' }}>
              ✅ This wallet is already saved to your profile
            </div>
          ) : (
            <button
              onClick={saveWalletAddress}
              disabled={loading}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                marginBottom: '0.75rem',
                width: '100%',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '⏳ Saving...' : '💾 Save This Wallet to Profile'}
            </button>
          )}

          <button
            onClick={disconnectWallet}
            style={{
              background: '#f5f5f5',
              color: '#666',
              border: '1px solid #ddd',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              width: '100%',
            }}
          >
            🔌 Disconnect Wallet
          </button>
        </div>
      )}

      <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>
        <strong>Network:</strong> Polygon Amoy (ChainID: 80002)
        <br />
        <strong>Note:</strong> Your wallet address will be used for case payments and settlements.
      </p>
    </div>
  );
};

export default WalletSettings;
