# Offline Sync & Conflict Resolution Plan

## Overview
This document outlines a strategy for enabling offline-first functionality in the TodoApp with automatic conflict resolution.

## Architecture

### 1. Local Storage (IndexedDB)
- Store todos, subtasks, and reminders locally for instant access
- Use timestamps and version numbers for conflict detection
- Synced state: `{'id', 'title', ..., 'last_synced_at', 'version'}`

### 2. Service Worker
- Cache app shell and assets for offline access
- Intercept network requests to Supabase
- Queue writes when offline; sync when online

### 3. Change Queue
- Store mutations (create, update, delete) locally
- Prioritize changes by timestamp
- Replay on reconnect with conflict resolution

## Conflict Resolution Strategy

### Last-Write-Wins (LWW)
- Default: newer timestamp overwrites older
- Fields tracked independently for fine-grained resolution
- Example:
  ```typescript
  local:  { title: 'Buy milk', updated_at: 2025-12-10T10:00:00Z, version: 3 }
  remote: { title: 'Get milk & eggs', updated_at: 2025-12-10T10:05:00Z, version: 4 }
  result: Use remote (newer)
  ```

### Custom Conflict Rules
- For assignment changes: assigner wins (prevent unintended rejection)
- For subtask completion: local win (optimistic UI)
- For deletion: ignore local delete if remote has newer edits

### Operational Transformation (OT) - Future
- For high-contention scenarios (real-time collab)
- Transform concurrent edits to preserve intent
- Example: Two users adding subtasks → merge both

## Implementation Phases

### Phase 1: Local Caching (Current)
- ✅ Use localStorage for quick lookups
- ✅ Load from Supabase on app start
- ⏳ Implement IndexedDB for larger datasets

### Phase 2: Offline Detection & Queuing
- Add `navigator.onLine` listener
- Queue mutations when offline
- Show "Syncing..." indicator
- Implement optimistic UI updates

### Phase 3: Sync Engine
- Replay queued mutations on reconnect
- Detect conflicts with remote state
- Apply LWW resolution
- Notify user of resolved conflicts

### Phase 4: Advanced Features
- Selective sync (user-chosen todos to sync)
- Bandwidth optimization (delta sync)
- Encryption for sensitive data
- Cross-device sync

## Code Hooks & Integration Points

### useOfflineSync Hook (TODO)
```typescript
const { syncState, queueMutation, resolveConflict } = useOfflineSync();

// In component:
if (syncState === 'syncing') show <Loader />;
if (syncState === 'conflict') show <ConflictDialog />;
```

### Mutation Handler Pattern
```typescript
const updateTodo = async (todo) => {
  // 1. Optimistic update (local)
  setTodos(prev => prev.map(t => t.id === todo.id ? todo : t));
  
  // 2. Queue mutation (offline-aware)
  const result = await queueMutation('update_todo', todo);
  
  // 3. On sync, check for conflicts
  if (result.conflict) {
    // Show resolution UI or auto-resolve
  }
};
```

## Database Triggers for Sync
```sql
-- Track last_modified per todo for LWW
ALTER TABLE todos ADD COLUMN last_modified_at TIMESTAMP;
CREATE TRIGGER set_last_modified BEFORE UPDATE ON todos
  FOR EACH ROW SET last_modified_at = NOW();

-- Audit log for conflict resolution
CREATE TABLE sync_log (
  id UUID,
  todo_id UUID,
  operation TEXT, -- 'create', 'update', 'delete'
  old_values JSONB,
  new_values JSONB,
  synced_at TIMESTAMP
);
```

## Offline Indicators & UX

- **Offline badge**: Show "📡 Offline" in header
- **Sync status**: "🔄 Syncing 3 changes..."
- **Conflict prompt**: "Changes conflict. Keep local or remote?"
- **Retry button**: Manual sync trigger
- **Toast notifications**: "✅ Synced 5 tasks"

## Testing Strategy

- Unit tests for conflict resolution logic
- Integration tests with mock Supabase
- E2E tests: offline → online → conflict scenarios
- Performance tests: sync 1000+ todos

## Future Enhancements

1. **Real-time Collaboration**: Use Supabase Realtime + OT
2. **Bandwidth Optimization**: Delta sync, compression
3. **Data Encryption**: E2E encryption for offline data
4. **Multi-Device Sync**: Prioritize primary device changes
5. **Analytics**: Track sync patterns, conflict frequency

## References

- [Supabase Offline-First Guide](https://supabase.com/docs)
- [CRDTs vs OT](https://en.wikipedia.org/wiki/Operational_transformation)
- [Last-Write-Wins Semantics](https://en.wikipedia.org/wiki/Last_write_wins)
