"use client";

import useTheme from "@/hooks/use-theme";
import { getCSSVar, useMobileScreen } from "@/hooks/utils";
import { PDFDocument } from "@/types/supa.tables";
import { useEffect } from "react";
import styles from "./home.module.scss";
import Sidebar from "./sidebar";

export default function Home({
  documents,
  children,
}: {
  documents: PDFDocument[];
  children: React.ReactNode;
}) {
  const isMobileScreen = useMobileScreen();
  const { theme } = useTheme();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (theme === "dark") {
      document.body.classList.add("dark");
    } else if (theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]'
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]'
    );

    if (theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [theme]);
  return (
    <div
      className={`${styles.container} ${
        !isMobileScreen ? styles["tight-container"] : styles.container
      }`}
    >
      <Sidebar documents={documents} className={styles["sidebar-show"]} />
      <div className={styles["window-content"]} id="app-body">
        {children}
      </div>
    </div>
  );
}
