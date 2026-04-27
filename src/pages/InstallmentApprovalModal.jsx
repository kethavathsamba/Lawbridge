import React, { useState } from "react";
import { api } from "../services/api";
import "./InstallmentApprovalModal.css";

export default function InstallmentApprovalModal({
  isOpen,
  caseId,
  installmentRequest,
  onClose,
  onApprove,
  onReject,
  escrowAmount,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !installmentRequest) return null;

  const amount = parseFloat(installmentRequest.amount || 0);
  const note = installmentRequest.progressNote || "";

  const handleApprove = async () => {
    try {
      setError("");
      setLoading(true);

      await api.cases.decideInstallment(caseId, installmentRequest.id, true);
      onApprove();
    } catch (err) {
      setError(err.message || "Failed to approve installment");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setError("");
      setLoading(true);

      await api.cases.decideInstallment(caseId, installmentRequest.id, false);
      onReject();
    } catch (err) {
      setError(err.message || "Failed to reject installment");
    } finally {
      setLoading(false);
    }
  };

  const sufficientFunds = amount <= escrowAmount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Installment Payment Request</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="installment-details">
            <div className="detail-item">
              <span className="detail-label">Requested Amount:</span>
              <span className="detail-value amount">
                ₹ {amount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Available in Escrow:</span>
              <span className={`detail-value ${sufficientFunds ? "available" : "insufficient"}`}>
                ₹ {escrowAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Progress Note:</span>
              <p className="detail-value note-text">{note || "No note provided"}</p>
            </div>

            <div className="detail-item">
              <span className="detail-label">Requested On:</span>
              <span className="detail-value">
                {new Date(installmentRequest.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {!sufficientFunds && (
            <div className="warning-box">
              ⚠️ Insufficient funds in escrow. Available: ₹
              {escrowAmount.toLocaleString("en-IN")}, Requested: ₹
              {amount.toLocaleString("en-IN")}
            </div>
          )}

          <div className="info-box">
            <strong>How it works:</strong>
            <ul>
              <li>Money is held securely in escrow</li>
              <li>Only approved amount will be transferred to the lawyer</li>
              <li>You can reject any installment request</li>
              <li>Rejected amounts remain in your escrow</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleReject}
            disabled={loading}
          >
            {loading ? "Processing..." : "Reject"}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={loading || !sufficientFunds}
            title={!sufficientFunds ? "Insufficient escrow balance" : ""}
          >
            {loading ? "Processing..." : "Approve & Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}
