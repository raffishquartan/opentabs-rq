import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './retro/Button.js';
import { Dialog } from './retro/Dialog.js';
import { Switch } from './retro/Switch.js';

type ConfirmationData = {
  id: string;
  tool: string;
  plugin: string;
  params: Record<string, unknown>;
};

interface ConfirmationDialogProps {
  confirmations: ConfirmationData[];
  onRespond: (id: string, decision: 'allow' | 'deny', alwaysAllow?: boolean) => void;
}

/**
 * Clamps a tracked index to valid bounds after the list shrinks.
 * When the item at `currentIndex` is removed, the index stays the same,
 * pointing to the next item that slid into its position. If the removed
 * item was the last one, the index clamps down to the new last position.
 */
const resolveDisplayIndex = (currentIndex: number, count: number): number => Math.min(currentIndex, count - 1);

/**
 * A string is "long text" (a script, a query, an HTML fragment, ...) when squeezing it into a
 * single-line JSON dump would make it unreadable — either it has line breaks of its own, or it's
 * just long. These get their own labeled, wrapped, always-visible block instead of being buried
 * inside a JSON-escaped blob.
 */
const isLongTextValue = (value: unknown): value is string =>
  typeof value === 'string' && (value.includes('\n') || value.length > 100);

/** Splits a tool call's params into long text fields (shown verbatim) and the rest (shown as JSON). */
const splitParams = (
  params: Record<string, unknown>,
): { longText: [string, string][]; rest: Record<string, unknown> } => {
  const longText: [string, string][] = [];
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (isLongTextValue(value)) {
      longText.push([key, value]);
    } else {
      rest[key] = value;
    }
  }
  return { longText, rest };
};

/**
 * Builds a prompt the user can paste into a separate LLM session (Claude Code, claude.ai, or any
 * other tool) to get an independent security opinion on a pending tool call before approving it.
 */
const buildSecurityReviewPrompt = (confirmation: ConfirmationData): string => {
  const { longText, rest } = splitParams(confirmation.params);
  const paramBlocks: string[] = [];
  if (Object.keys(rest).length > 0) {
    paramBlocks.push(JSON.stringify(rest, null, 2));
  }
  for (const [key, value] of longText) {
    paramBlocks.push(`${key}:\n\`\`\`\n${value}\n\`\`\``);
  }

  return [
    "I'm about to approve a tool call requested by an AI agent on the OpenTabs MCP platform, and I want an independent security review before I click Allow.",
    '',
    `Tool: ${confirmation.tool}`,
    `Plugin: ${confirmation.plugin}`,
    '',
    'Parameters:',
    paramBlocks.length > 0 ? paramBlocks.join('\n\n') : '(none)',
    '',
    'Review this for security or privacy risks, in particular:',
    '- Data exfiltration: does it read cookies, localStorage/sessionStorage, auth tokens, or page content and send it to a third-party host?',
    '- Destructive or irreversible actions: does it delete, modify, or submit data (payments, messages, account settings)?',
    '- Obfuscated or suspicious logic that hides what the code actually does',
    '- Requests to a host other than the one the tool is scoped to',
    '',
    'Give a clear verdict - SAFE, SAFE WITH CAVEATS, or UNSAFE - followed by a short explanation.',
  ].join('\n');
};

const CopyPromptButton = ({ confirmation }: { confirmation: ConfirmationData }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(buildSecurityReviewPrompt(confirmation));
        setCopied(true);
      }}>
      {copied ? (
        <>
          <Check className="mr-1 h-3.5 w-3.5" /> Copied
        </>
      ) : (
        <>
          <Copy className="mr-1 h-3.5 w-3.5" /> Copy as prompt
        </>
      )}
    </Button>
  );
};

const ConfirmationDialog = ({ confirmations, onRespond }: ConfirmationDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [alwaysAllow, setAlwaysAllow] = useState(false);

  const count = confirmations.length;
  const safeIndex = resolveDisplayIndex(currentIndex, count);
  const current = confirmations[safeIndex];
  const { longText, rest } = splitParams(current?.params ?? {});

  const handleAllow = () => {
    if (!current) return;
    onRespond(current.id, 'allow', alwaysAllow || undefined);
    setAlwaysAllow(false);
  };

  const handleDeny = () => {
    if (!current) return;
    onRespond(current.id, 'deny');
    setAlwaysAllow(false);
  };

  return (
    <Dialog
      open={count > 0}
      onOpenChange={open => {
        if (!open) handleDeny();
      }}>
      <Dialog.Content onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <Dialog.Header>
          <span className="font-head text-sm">Approve Tool</span>
          {count > 1 && (
            <span className="font-mono text-xs">
              {safeIndex + 1} of {count}
            </span>
          )}
        </Dialog.Header>
        <Dialog.Body className="space-y-3">
          {current && (
            <>
              <div>
                <span className="text-muted-foreground text-xs">Tool</span>
                <div className="font-mono text-sm">{current.tool}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Plugin</span>
                <div className="font-sans text-sm">{current.plugin}</div>
              </div>
              {Object.keys(rest).length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Parameters</span>
                  <pre className="mt-1 max-h-40 min-w-0 overflow-auto rounded border border-border bg-card px-2 py-1 font-mono text-xs leading-tight">
                    {JSON.stringify(rest, null, 2)}
                  </pre>
                </div>
              )}
              {longText.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <span className="text-muted-foreground text-xs">{key}</span>
                  <pre className="mt-1 max-h-56 min-w-0 overflow-y-auto whitespace-pre-wrap break-words rounded border border-border bg-card px-2 py-1 font-mono text-xs leading-snug">
                    {value}
                  </pre>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Switch checked={alwaysAllow} onCheckedChange={setAlwaysAllow} aria-label="Always allow this tool" />
                <div>
                  <span className="text-sm">Always allow this tool</span>
                  <p className="text-muted-foreground text-xs">Sets permission to Auto</p>
                </div>
              </div>
            </>
          )}
        </Dialog.Body>
        <Dialog.Footer>
          {count > 1 && (
            <>
              <button
                type="button"
                className="mr-auto cursor-pointer font-mono text-muted-foreground text-xs hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safeIndex === 0}
                onClick={() => setCurrentIndex(i => i - 1)}>
                prev
              </button>
              <button
                type="button"
                className="mr-2 cursor-pointer font-mono text-muted-foreground text-xs hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safeIndex >= count - 1}
                onClick={() => setCurrentIndex(i => i + 1)}>
                next
              </button>
            </>
          )}
          {current && <CopyPromptButton confirmation={current} />}
          <Button size="sm" variant="outline" onClick={handleDeny}>
            Deny
          </Button>
          <Button size="sm" onClick={handleAllow}>
            Allow
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
};

export type { ConfirmationData };
export { buildSecurityReviewPrompt, ConfirmationDialog, isLongTextValue, resolveDisplayIndex, splitParams };
