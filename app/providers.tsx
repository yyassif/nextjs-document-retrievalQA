"use client";

import { Worker } from "@react-pdf-viewer/core";

export default function PDFJSWprker({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.js">
      {children}
    </Worker>
  );
}
