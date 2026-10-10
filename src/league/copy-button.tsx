"use client";

import { useState } from "react";

export const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };
  return (
    <button type="button" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
};
