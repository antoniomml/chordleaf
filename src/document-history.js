/** Document operations share a bounded, per-song undo stack. Source edits
 * invalidate stale snapshots instead of overwriting newer text. */
export function createDocumentHistory({ song, update }) {
  const histories = new WeakMap();
  function state() {
    const owner = song();
    if (!owner) return;
    if (!histories.has(owner))
      histories.set(owner, { history: [], future: [] });
    return histories.get(owner);
  }
  function record(before, after, offset = 0) {
    if (before === after) return;
    const value = state();
    if (value.history.at(-1)?.after !== before) value.history.length = 0;
    value.future.length = 0;
    value.history.push({ before, after, offset });
    if (value.history.length > 50) value.history.shift();
  }
  function peek(redo = false) {
    const value = state();
    const entry = (redo ? value?.future : value?.history)?.at(-1);
    return entry && (redo ? entry.before : entry.after) === song()?.text
      ? entry
      : undefined;
  }
  function restore(redo = false) {
    const entry = peek(redo);
    if (!entry) return false;
    const value = state(),
      from = redo ? value.future : value.history,
      to = redo ? value.history : value.future;
    from.pop();
    to.push(entry);
    if (update(redo ? entry.after : entry.before) === false) {
      to.pop();
      from.push(entry);
      return false;
    }
    return entry;
  }
  return { record, peek, restore };
}
