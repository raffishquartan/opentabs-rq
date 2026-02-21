import { Wrench } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { Suspense } from 'react';
import type { IconName } from 'lucide-react/dynamic';

interface ToolIconProps {
  icon?: string;
  className?: string;
}

const FallbackIcon = () => <Wrench className="text-muted-foreground h-3 w-3" />;

const ToolIcon = ({ icon, className = '' }: ToolIconProps) => (
  <div
    className={`border-border bg-muted/50 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${className}`}>
    {icon ? (
      <Suspense fallback={<FallbackIcon />}>
        <DynamicIcon name={icon as IconName} className="text-muted-foreground h-3 w-3" fallback={FallbackIcon} />
      </Suspense>
    ) : (
      <FallbackIcon />
    )}
  </div>
);

export { ToolIcon };
