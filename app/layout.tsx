import Home from "@/components/ui/home";
import { createClient } from "@/lib/supabase/server";
import { Metadata, Viewport } from "next";
import PDFJSWprker from "./providers";

import "@/styles/highlight.scss";

import "@/styles/markdown.scss";

import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: "MedicalChat",
  description: "Your personal GPT Chat Bot.",
  category: "technology",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#151515" },
  ],
  appleWebApp: {
    title: "MedicalChat",
    statusBarStyle: "default",
  },
  authors: [
    {
      name: "yyassif",
      url: "https://yyassif.dev",
    },
  ],
  creator: "YASSIF Yassine",
  publisher: "YASSIF Yassine",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data } = await supabase.from("documents").select("*");

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PDFJSWprker>
          <Home documents={data}>{children}</Home>
        </PDFJSWprker>
      </body>
    </html>
  );
}
