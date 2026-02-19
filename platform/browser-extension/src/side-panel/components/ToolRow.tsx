import { Loader } from './retro/Loader.js';
import { Switch } from './retro/Switch.js';
import { Tooltip } from './retro/Tooltip.js';
import { ToolIcon } from './ToolIcon.js';

const ToolRow = ({
  name,
  description,
  enabled,
  active,
  onToggle,
}: {
  name: string;
  description: string;
  enabled: boolean;
  active: boolean;
  onToggle: () => void;
}) => (
  <div
    className={`border-border hover:bg-muted/50 flex items-center gap-2 border-b px-3 py-1.5 transition-colors last:border-b-0 ${active ? 'bg-accent/20' : ''}`}>
    <ToolIcon toolName={name} />
    <Tooltip.Provider>
      <Tooltip>
        <Tooltip.Trigger asChild>
          <div className="min-w-0 flex-1">
            <div className="text-foreground truncate text-[13px]">{description}</div>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{name}</Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
    <div className="flex shrink-0 items-center gap-2">
      {active && <Loader size="sm" count={2} duration={0.4} delayStep={80} />}
      <Switch
        checked={enabled}
        onCheckedChange={() => onToggle()}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        aria-label={`Toggle ${name} tool`}
      />
    </div>
  </div>
);

export { ToolRow };
