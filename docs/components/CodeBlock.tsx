'use client';

import { Check, ClipboardCopy } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/retroui';
import { cn } from '@/lib/utils';

export const CodeBlock = ({
  className,
  children,
  'data-language': language,
  'data-copy': forceCopy,
  ...props
}: HTMLAttributes<HTMLPreElement> & { 'data-language'?: string; 'data-copy'?: string }) => {
  const [hasCopied, setHasCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const showCopy = (language !== undefined && language !== '') || forceCopy !== undefined;

  const handleClickCopy = () => {
    const code = preRef.current?.textContent;
    if (code) {
      setHasCopied(true);
      navigator.clipboard.writeText(code).catch(() => undefined);

      setTimeout(() => {
        setHasCopied(false);
      }, 3000);
    }
  };

  return (
    <div className="relative my-6">
      {showCopy && (
        <div className="hidden items-center justify-between rounded-t-(--radius) border-white/10 border-b bg-code-bg px-4 py-2 md:flex">
          {language ? <span className="font-mono text-code-fg text-xs">{language}</span> : <span />}
          <Button disabled={hasCopied} size="sm" onClick={handleClickCopy}>
            {hasCopied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
      <pre
        className={cn(
          'overflow-x-auto rounded-(--radius) bg-code-bg p-4 text-code-fg',
          showCopy && 'md:rounded-t-none',
          className,
        )}
        data-language={language}
        {...props}>
        <span ref={preRef}>{children}</span>
      </pre>
      {showCopy && (
        <Button disabled={hasCopied} size="icon" onClick={handleClickCopy} className="absolute top-3 right-3 md:hidden">
          {hasCopied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
};
