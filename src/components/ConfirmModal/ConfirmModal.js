import React, { useEffect } from "react";
import styles from "./ConfirmModal.module.css";

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) {
  // Close on escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className={styles.backdrop} style={{ zIndex: 1005 }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span>{title}</span>
          </div>
          <button onClick={onCancel} className={`btn btn-ghost btn-sm ${styles.closeBtn}`}>
            ✕
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.message}>{message}</p>
        </div>
        
        <div className={styles.modalFooter}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn btn-sm ${isDestructive ? styles.destructiveBtn : styles.primaryBtn}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
