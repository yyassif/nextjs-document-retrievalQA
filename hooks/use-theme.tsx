"use client";

import { useState } from "react";

const useTheme = () => {
  const [theme, setTheme] = useState("dark");

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return { theme, toggleTheme };
};

export default useTheme;
