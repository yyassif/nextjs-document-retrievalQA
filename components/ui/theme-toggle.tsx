"use client"

import useTheme from "@/hooks/use-theme"
import * as React from "react"
import { Icons } from "../icons"


export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="no-dark" onClick={() => toggleTheme()}>
       {theme === "light" && (<Icons.sun className="user-avatar" />)}
       {theme === "dark" && (<Icons.moon className="user-avatar" />)}
    </div>
  )
}