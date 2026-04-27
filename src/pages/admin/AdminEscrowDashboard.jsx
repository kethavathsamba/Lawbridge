import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import "./AdminEscrowDashboard.css";

export default function AdminEscrowDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchDashboard();
    fetchTransactions();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboard();
      fetchTransactions();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await api.payments.adminDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message || "Failed to fetch dashboard");
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await api.payments.transactions();
      setTransactions(data || []);
    } catch (err) {
      setError(err.message || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = () => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.type === filter);
  };

  const statusColor = (status) => {
    switch (status) {
      case "payment_received":
        return "payment-received";
      case "disbursed":
        return "disbursed";
      case "pending":
        return "pending";
      case "rejected":
        return "rejected";
      default:
        return "default";
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case "payment_received":
        return "Held in Escrow";
      case "disbursed":
        return "Transferred to Lawyer";
      case "pending":
        return "Pending";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  if (loading) return <div className="escrow-loading">Loading...</div>;

  return (
    <div className="escrow-dashboard">
      <div className="escrow-header">
        <h1>Escrow Management Dashboard</h1>
        <p>Monitor all client payments held in escrow</p>
      </div>

      {error && <div className="escrow-error">{error}</div>}

      {dashboard && (
        <div className="dashboard-stats">
          <div className="stat-card escrow-held">
            <div className="stat-label">Total Held in Escrow</div>
            <div className="stat-value">
              ₹ {(dashboard.totalEscrowHeld || 0).toLocaleString("en-IN")}
            </div>
            <div className="stat-subtitle">Client payments waiting</div>
          </div>

          <div className="stat-card disbursed">
            <div className="stat-label">Total Disbursed</div>
            <div className="stat-value">
              ₹ {(dashboard.totalDisbursed || 0).toLocaleString("en-IN")}
            </div>
            <div className="stat-subtitle">Transferred to lawyers</div>
          </div>

          <div className="stat-card pending">
            <div className="stat-label">Pending Installments</div>
            <div className="stat-value">{dashboard.pendingInstallments || 0}</div>
            <div className="stat-subtitle">Awaiting client approval</div>
          </div>

          <div className="stat-card active">
            <div className="stat-label">Active Cases</div>
            <div className="stat-value">{dashboard.activeCases || 0}</div>
            <div className="stat-subtitle">Cases in progress</div>
          </div>
        </div>
      )}

      <div className="transactions-section">
        <div className="section-header">
          <h2>Transaction History</h2>
          <div className="filter-controls">
            <button
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === "full_payment" ? "active" : ""}`}
              onClick={() => setFilter("full_payment")}
            >
              Full Payments
            </button>
            <button
              className={`filter-btn ${filter === "installment_transfer" ? "active" : ""}`}
              onClick={() => setFilter("installment_transfer")}
            >
              Installments
            </button>
          </div>
        </div>

        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions().length > 0 ? (
                filteredTransactions().map((trans) => (
                  <tr key={trans.id}>
                    <td>
                      <code className="case-id">{trans.caseId.substring(0, 8)}...</code>
                    </td>
                    <td>
                      <span className={`type-badge ${trans.type}`}>
                        {trans.type === "full_payment"
                          ? "Full Payment"
                          : "Installment Transfer"}
                      </span>
                    </td>
                    <td className="amount">
                      ₹ {parseFloat(trans.amount).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className={`status-badge ${statusColor(trans.status)}`}>
                        {statusLabel(trans.status)}
                      </span>
                    </td>
                    <td className="date">
                      {new Date(trans.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      <span className="detail-text" title={trans.reason || "N/A"}>
                        {trans.reason ? trans.reason.substring(0, 30) : "—"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
