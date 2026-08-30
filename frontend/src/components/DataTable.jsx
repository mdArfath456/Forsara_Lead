import { motion } from 'framer-motion';

export function DataTable({ columns, rows, onRowClick, bulkSelection }) {
  const { selectedIds, toggleId, toggleAll } = bulkSelection || {};

  return (
    <div className="overflow-x-auto rounded-2xl glass-panel">
      <table className="min-w-full text-sm">
        <thead className="text-left text-gray-500 border-b border-white/[0.06]">
          <tr>
            {bulkSelection && (
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  className="accent-brand-500"
                  onChange={(e) => toggleAll(e.target.checked)}
                  checked={rows.length > 0 && selectedIds.size === rows.length}
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} className="p-3 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={row._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              onClick={() => onRowClick?.(row)}
              className="border-t border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors"
            >
              {bulkSelection && (
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="accent-brand-500" checked={selectedIds.has(row._id)} onChange={() => toggleId(row._id)} />
                </td>
              )}
              {columns.map((col) => (
                <td key={`${row._id}-${col.key}`} className="p-3 text-gray-300">
                  {col.render ? col.render(row) : row[col.key] ?? <span className="text-gray-600">—</span>}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
