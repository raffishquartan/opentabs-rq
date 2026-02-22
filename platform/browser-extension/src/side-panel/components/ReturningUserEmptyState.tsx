import { Empty } from './retro/Empty.js';
import { useEffect, useRef, useState } from 'react';

interface ReturningUserEmptyStateProps {
  onResetOnboarding: () => void;
}

const ReturningUserEmptyState = ({ onResetOnboarding }: ReturningUserEmptyStateProps) => {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleClick = () => {
    if (confirming) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onResetOnboarding();
    } else {
      setConfirming(true);
      timerRef.current = window.setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <Empty>
      <Empty.Content>
        <Empty.Title>No Plugins Installed</Empty.Title>
        <Empty.Separator />
        <div className="flex flex-col gap-2 text-center">
          <p className="text-muted-foreground text-sm">Install a plugin:</p>
          <code className="rounded border-2 px-3 py-2 font-mono text-sm">npm install -g opentabs-plugin-slack</code>
          <p className="text-muted-foreground text-sm">
            Or search for plugins:{' '}
            <code className="rounded border px-1.5 py-0.5 font-mono text-xs">opentabs plugin search</code>
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="text-muted-foreground hover:text-foreground mt-2 cursor-pointer text-xs underline opacity-60 transition-opacity hover:opacity-100">
          {confirming ? 'Click again to confirm' : 'Show setup guide'}
        </button>
      </Empty.Content>
    </Empty>
  );
};

export { ReturningUserEmptyState };
