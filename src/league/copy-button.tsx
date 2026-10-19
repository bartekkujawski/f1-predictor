"use client";

import { useState } from "react";
import { Button } from "../ui/button";

export const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };
  return (
    <Button type="button" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </Button>
  );
};
