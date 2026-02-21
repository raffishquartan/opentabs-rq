"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/retroui";

interface ICodeBlock extends React.HTMLAttributes<HTMLPreElement> {}

export function CodeBlock({ className, children, ...props }: ICodeBlock) {
  const [hasCopied, setHasCopied] = React.useState(false);
  const preRef = React.useRef<HTMLPreElement>(null);

  const handleClickCopy = async () => {
    const code = preRef.current?.textContent;
    if (code) {
      setHasCopied(true);
      await navigator.clipboard.writeText(code);

      setTimeout(() => {
        setHasCopied(false);
      }, 3000);
    }
  };

  return (
    <div className="relative my-6">
      <pre
        className={cn(
          "overflow-x-auto rounded-(--radius) bg-code-bg p-4",
          className,
        )}
        {...props}
      >
        <Button
          id="cody-copy-button"
          data-umami-event="copy-code-button"
          disabled={hasCopied}
          className="absolute top-4 right-4 z-10"
          size="sm"
          onClick={handleClickCopy}
        >
          {hasCopied ? "Copied" : "Copy"}
        </Button>
        <span ref={preRef}>{children}</span>
      </pre>
    </div>
  );
}
