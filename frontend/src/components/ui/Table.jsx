import React from 'react';

const Table = ({ children, className = '' }) => (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}>
        <table className="w-full text-sm min-w-[600px]">
            {children}
        </table>
    </div>
);

const TableHeader = ({ children, className = '' }) => (
    <thead className={`bg-gray-50 ${className}`}>
        {children}
    </thead>
);

const TableBody = ({ children, className = '' }) => (
    <tbody className={`divide-y divide-gray-100 ${className}`}>
        {children}
    </tbody>
);

const TableRow = ({ children, className = '', onClick, clickable = false }) => (
    <tr
        className={`
      ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}
      transition-colors
      ${className}
    `}
        onClick={onClick}
    >
        {children}
    </tr>
);

const TableHead = ({ children, className = '' }) => (
    <th className={`px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider ${className}`}>
        {children}
    </th>
);

const TableCell = ({ children, className = '' }) => (
    <td className={`px-4 py-3 text-gray-700 ${className}`}>
        {children}
    </td>
);

const TableEmpty = ({ message = 'No data available', colSpan = 1 }) => (
    <tr>
        <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-400">
            {message}
        </td>
    </tr>
);

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;
Table.Empty = TableEmpty;

export default Table;
