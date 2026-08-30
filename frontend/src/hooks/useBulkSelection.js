import { useState, useMemo } from 'react';

export function useBulkSelection(rows) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleId = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelectedIds(checked ? new Set(rows.map((r) => r._id)) : new Set());
  };

  const clear = () => setSelectedIds(new Set());

  return useMemo(() => ({ selectedIds, toggleId, toggleAll, clear }), [selectedIds]);
}
