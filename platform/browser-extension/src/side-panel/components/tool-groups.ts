interface Groupable {
  readonly group?: string;
}

interface ToolGroup<T> {
  readonly name: string;
  readonly tools: T[];
}

/**
 * Group tools by their `group` field, preserving first-seen order.
 * The 'Other' group (tools with no group) is sorted to the end.
 * Returns null if no tool has a group field (caller should render a flat list).
 */
function groupTools<T extends Groupable>(tools: readonly T[]): ToolGroup<T>[] | null {
  if (!tools.some(t => t.group)) return null;
  const groupMap = new Map<string, T[]>();
  for (const tool of tools) {
    const groupName = tool.group ?? 'Other';
    let bucket = groupMap.get(groupName);
    if (!bucket) {
      bucket = [];
      groupMap.set(groupName, bucket);
    }
    bucket.push(tool);
  }
  const otherBucket = groupMap.get('Other');
  groupMap.delete('Other');
  const result: ToolGroup<T>[] = [];
  for (const [name, grouped] of groupMap) {
    result.push({ name, tools: grouped });
  }
  if (otherBucket) {
    result.push({ name: 'Other', tools: otherBucket });
  }
  return result;
}

export type { ToolGroup };
export { groupTools };
