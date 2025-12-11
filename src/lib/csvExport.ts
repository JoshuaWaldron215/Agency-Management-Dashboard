type CSVValue = string | number | boolean | null | undefined;

interface CSVOptions {
  filename: string;
  headers: string[];
  rows: CSVValue[][];
}

function escapeCSVValue(value: CSVValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

export function generateCSV(options: CSVOptions): string {
  const { headers, rows } = options;
  
  const headerLine = headers.map(escapeCSVValue).join(',');
  const dataLines = rows.map(row => row.map(escapeCSVValue).join(','));
  
  return [headerLine, ...dataLines].join('\n');
}

export function downloadCSV(options: CSVOptions): void {
  const csvContent = generateCSV(options);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename}.csv`;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  return `$${value.toFixed(2)}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}
