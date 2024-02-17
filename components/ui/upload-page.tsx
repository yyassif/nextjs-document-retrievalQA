"use client";

import styles from "./chat.module.scss";
import UploadFile from "./upload-file";

export default function UploadPage() {
  return (
    <div className={styles.chat}>
      <div className="window-header">
        <div className={`window-header-title ${styles["chat-body-title"]}`}>
          <div
            className={`window-header-main-title ${styles["chat-body-main-title"]}`}
          >
            Upload PDF Documents
          </div>
        </div>
      </div>

      <div className={styles["chat-body"]}>
        <UploadFile />
      </div>
    </div>
  );
}
