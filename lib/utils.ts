export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function generateRandomToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Exports an array of objects to a CSV file and triggers download.
 * 
 * @param data - Array of objects to export. Must not be empty.
 * @param filename - Optional filename for the downloaded CSV (default: 'export.csv')
 * 
 * @throws {Error} Throws 'No data to export' if data array is empty or null
 * 
 * @remarks
 * - Callers MUST wrap calls in try-catch to handle the 'No data to export' error
 * - The function creates a blob URL and revokes it after download initiation
 * - CSV escaping handles quoted strings and newlines properly
 * - Objects and arrays are serialized as JSON strings in cells
 * 
 * @example
 * try {
 *   exportToCSV(records, 'data.csv');
 * } catch (error) {
 *   console.error('Export failed:', error);
 *   alert('Failed to export: ' + (error instanceof Error ? error.message : 'Unknown error'));
 * }
 */
export function exportToCSV(data: any[], filename: string = 'export.csv'): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  data.forEach((item) => {
    Object.keys(item).forEach((key) => allKeys.add(key));
  });
  
  const headers = Array.from(allKeys);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.map((h) => `"${h}"`).join(','),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          
          // Handle different data types
          if (value === null || value === undefined) {
            return '';
          }
          
          if (typeof value === 'object') {
            // For arrays and objects, stringify them
            const stringified = JSON.stringify(value);
            return `"${stringified.replace(/"/g, '""')}"`;
          }
          
          if (typeof value === 'string') {
            // Escape quotes in strings
            return `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Revoke blob URL after download starts to prevent memory leak
  // Use click handler for reliable cleanup that doesn't race with download initiation
  link.onclick = () => {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 500); // Allow 500ms for browser to process download before revoking
  };
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

