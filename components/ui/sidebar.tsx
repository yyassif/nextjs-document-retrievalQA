"use client";

import { Loading, showConfirm } from "@/components/ui/ui-lib";
import { isIOS, useMobileScreen } from "@/hooks/utils";
import { Conversation } from "@/types/supa.tables";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "../icons";
import { IconButton } from "./button";
import styles from "./home.module.scss";

import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  NARROW_SIDEBAR_WIDTH,
} from "@/lib/constants";
import NewConversation from "./new-conversation";
import UploadLink from "./upload-link";

const ChatList = dynamic(async () => (await import("./chat-list")).ChatList, {
  loading: () => <Loading />,
});

function useDragSideBar() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    DEFAULT_SIDEBAR_WIDTH
  );
  const limit = (x: number) => Math.min(MAX_SIDEBAR_WIDTH, x);
  const startX = useRef(0);
  const startDragWidth = useRef(sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
  const lastUpdateTime = useRef(Date.now());

  const toggleSideBar = () => {
    if (sidebarWidth < MIN_SIDEBAR_WIDTH) {
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    } else {
      setSidebarWidth(NARROW_SIDEBAR_WIDTH);
    }
  };

  const onDragStart = (e: MouseEvent) => {
    startX.current = e.clientX;
    startDragWidth.current = sidebarWidth;
    const dragStartTime = Date.now();

    const handleDragMove = (e: MouseEvent) => {
      if (Date.now() < lastUpdateTime.current + 20) {
        return;
      }
      lastUpdateTime.current = Date.now();
      const d = e.clientX - startX.current;
      const nextWidth = limit(startDragWidth.current + d);
      if (nextWidth < MIN_SIDEBAR_WIDTH) {
        setSidebarWidth(NARROW_SIDEBAR_WIDTH);
      } else {
        setSidebarWidth(nextWidth);
      }
    };

    const handleDragEnd = () => {
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);

      // if user click the drag icon, should toggle the sidebar
      const shouldFireClick = Date.now() - dragStartTime < 300;
      if (shouldFireClick) {
        toggleSideBar();
      }
    };

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
  };

  const isMobileScreen = useMobileScreen();
  const shouldNarrow = !isMobileScreen && sidebarWidth < MIN_SIDEBAR_WIDTH;

  useEffect(() => {
    const barWidth = shouldNarrow
      ? NARROW_SIDEBAR_WIDTH
      : limit(sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
    const sideBarWidth = isMobileScreen ? "100vw" : `${barWidth}px`;
    document.documentElement.style.setProperty("--sidebar-width", sideBarWidth);
  }, [sidebarWidth, isMobileScreen, shouldNarrow]);

  return {
    onDragStart,
    shouldNarrow,
  };
}

export default function Sidebar(props: {
  conversations: Conversation[];
  className?: string;
}) {
  const { onDragStart, shouldNarrow } = useDragSideBar();
  const isMobileScreen = useMobileScreen();
  const isIOSMobile = useMemo(
    () => isIOS() && isMobileScreen,
    [isMobileScreen]
  );

  return (
    <div
      className={`${styles.sidebar} ${props.className} ${
        shouldNarrow && styles["narrow-sidebar"]
      }`}
      style={{
        transition: isMobileScreen && isIOSMobile ? "none" : "",
        marginTop: "8px",
      }}
    >
      <div className={styles["sidebar-header"]}>
        <div className={styles["sidebar-title"]}>MedicalChat</div>
        <div className={styles["sidebar-sub-title"]}>
          Your Medical-AI Assistant.
        </div>
        <div className={styles["sidebar-logo"] + " no-dark"}>
          <Icons.chatgpt />
        </div>
      </div>

      <UploadLink shouldNarrow={shouldNarrow} />
      <NewConversation shouldNarrow={shouldNarrow} />
      <div
        className={styles["sidebar-body"]}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            // Navigate to Home
          }
        }}
      >
        <span style={{ textTransform: "capitalize", marginBottom: "8px" }}>
          Conversations
        </span>
        <ChatList conversations={props.conversations} narrow={shouldNarrow} />
      </div>

      <div className={styles["sidebar-tail"]}>
        <div className={styles["sidebar-actions"]}>
          <div className={styles["sidebar-action"] + " " + styles.mobile}>
            <IconButton
              icon={<Icons.delete />}
              onClick={async () => {
                if (
                  await showConfirm(
                    "Confirm to delete the selected conversation?"
                  )
                ) {
                  // Delete Current Chat
                }
              }}
            />
          </div>
        </div>
      </div>

      <div
        className={styles["sidebar-drag"]}
        onPointerDown={(e) => onDragStart(e as any)}
      >
        <Icons.drag />
      </div>
    </div>
  );
}
