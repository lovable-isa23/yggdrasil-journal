

## Plan: Fix Missing Connection Paths for Hidden Gems

### Root Cause

The issue is in the edge function's path reconstruction logic. "Hidden Gem" (`quantum_discovered`) nodes are by definition **not** direct neighbors of the start node. Two problems cause missing paths:

1. **Random walk teleportation**: When a node has no neighbors during the walk, the code teleports randomly (`current = Math.floor(Math.random() * nodes.length)` at line 99). A node discovered via teleportation has no actual edge path, so BFS returns `null`.

2. **Fallback doesn't create a path**: When BFS returns null (lines 417-438), the fallback only creates a `connectionPath` entry if there's a **direct relationship** between start and discovered node. But hidden gems are specifically nodes that are NOT direct neighbors, so this fallback produces an empty path too.

### Fix

**File**: `supabase/functions/quantum-discovery/index.ts`

1. **Skip teleported visits**: In `classicalRandomWalk`, don't count visits that arrive via teleportation (the `Math.random()` branch). Only count visits reached through actual edges. This prevents surfacing nodes with no real graph connection.

2. **Synthetic path for unreachable-but-related nodes**: When BFS returns null but the node was legitimately discovered, create a synthetic connection path: `startNode → discoveredNode` with a description like "Indirectly connected through shared journal patterns". This ensures hidden gems always display a visible path.

3. **Multi-hop fallback path**: Before the synthetic path, try a 2-hop search: check if any intermediate node connects both start and discovered node via edges. If found, show `startNode → intermediate → discoveredNode` for a more meaningful path.

### Summary

| File | Changes |
|------|---------|
| `supabase/functions/quantum-discovery/index.ts` | Skip teleportation visits in walk; add 2-hop fallback path when BFS fails; add synthetic path as last resort |

