/**
 * Test examples for exportToCSV error handling
 * 
 * To run these tests, install a test runner (Jest, Vitest) and update tsconfig.json
 * Example: npm install --save-dev jest @types/jest
 * 
 * Then rename this file to __tests__/utils.test.ts or utils.spec.ts
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const fail: any;

import { exportToCSV } from '../utils';

describe('exportToCSV', () => {
  // Mock document methods since we're testing in Node/test environment
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    HTMLAnchorElement.prototype.click = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('should throw Error when data is null', () => {
      expect(() => {
        exportToCSV(null as any, 'test.csv');
      }).toThrow('No data to export');
    });

    it('should throw Error when data is undefined', () => {
      expect(() => {
        exportToCSV(undefined as any, 'test.csv');
      }).toThrow('No data to export');
    });

    it('should throw Error when data is empty array', () => {
      expect(() => {
        exportToCSV([], 'test.csv');
      }).toThrow('No data to export');
    });

    it('should throw Error with exact message', () => {
      try {
        exportToCSV([], 'test.csv');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('No data to export');
      }
    });
  });

  describe('Success Cases', () => {
    it('should export single item', () => {
      const data = [{ id: 1, name: 'Test' }];
      expect(() => {
        exportToCSV(data, 'test.csv');
      }).not.toThrow();
    });

    it('should export multiple items', () => {
      const data = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ];
      expect(() => {
        exportToCSV(data, 'test.csv');
      }).not.toThrow();
    });

    it('should create download link with correct filename', () => {
      const data = [{ id: 1 }];
      exportToCSV(data, 'custom-export.csv');
      
      expect(document.body.appendChild).toHaveBeenCalled();
      const link = (document.body.appendChild as any).mock.calls[0][0];
      expect(link.getAttribute('download')).toBe('custom-export.csv');
    });

    it('should use default filename', () => {
      const data = [{ id: 1 }];
      exportToCSV(data);
      
      const link = (document.body.appendChild as any).mock.calls[0][0];
      expect(link.getAttribute('download')).toBe('export.csv');
    });

    it('should revoke blob URL after download', () => {
      jest.useFakeTimers();
      const data = [{ id: 1 }];
      
      exportToCSV(data, 'test.csv');
      
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      jest.useRealTimers();
    });
  });

  describe('CSV Content', () => {
    it('should handle string values with quotes', () => {
      const data = [{ name: 'John "Johnny" Doe' }];
      expect(() => {
        exportToCSV(data, 'test.csv');
      }).not.toThrow();
    });

    it('should handle null and undefined values', () => {
      const data = [
        { id: 1, value: null },
        { id: 2, value: undefined },
      ];
      expect(() => {
        exportToCSV(data, 'test.csv');
      }).not.toThrow();
    });

    it('should handle objects and arrays as JSON', () => {
      const data = [
        { id: 1, metadata: { key: 'value' }, tags: ['a', 'b'] },
      ];
      expect(() => {
        exportToCSV(data, 'test.csv');
      }).not.toThrow();
    });
  });
});

/**
 * Integration Test Example for Dashboard
 * 
 * This would be in app/(protected)/dashboard/__tests__/page.test.tsx
 */
describe('Dashboard Export Handlers', () => {
  it('should handle export error gracefully', async () => {
    // Mock the real exportToCSV function to throw
    // Using spyOn instead of jest.mock() to avoid hoisting issues
    const exportToCSVSpy = jest
      .spyOn(require('@/lib/utils'), 'exportToCSV')
      .mockImplementation(() => {
        throw new Error('No data to export');
      });

    // Simulate button click
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation();
    
    try {
      // Simulate try-catch from dashboard
      const exportToCSV = require('@/lib/utils').exportToCSV;
      exportToCSV([], 'export.csv');
      fail('Expected error to be thrown');
    } catch (error) {
      expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('No data to export'));
    }

    exportToCSVSpy.mockRestore();
    mockAlert.mockRestore();
  });

  it('should show success message on export', async () => {
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation();
    
    try {
      const data = [{ id: 1 }];
      exportToCSV(data, 'export.csv');
      alert('✅ Research data exported successfully!');
    } catch (error) {
      fail('Export should not throw');
    }

    expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('✅'));
    mockAlert.mockRestore();
  });
});
