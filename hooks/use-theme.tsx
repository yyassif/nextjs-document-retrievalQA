"use client";

import { useState } from "react";

const useTheme = () => {
  const [theme, setTheme] = useState("light");
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    const body = document.getElementsByTagName("body")
    body.item(0).className = nextTheme;
  };

  return { theme, toggleTheme };
};

export default useTheme;
