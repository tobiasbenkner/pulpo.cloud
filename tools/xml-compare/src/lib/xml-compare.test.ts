import { describe, it, expect } from 'vitest';
import { parseXml, compareXml, getStats, findLineInXml } from './xml-compare';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper to load test files
function loadTestCase(name: string): { a: string; b: string } {
  const basePath = join(__dirname, '../../test-cases');
  return {
    a: readFileSync(join(basePath, `${name}.a.xml`), 'utf-8'),
    b: readFileSync(join(basePath, `${name}.b.xml`), 'utf-8'),
  };
}

describe('parseXml', () => {
  it('should parse valid XML', () => {
    const xml = '<root><child>text</child></root>';
    const result = parseXml(xml);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('root');
    expect(result?.children).toHaveLength(1);
    expect(result?.children[0].name).toBe('child');
    expect(result?.children[0].text).toBe('text');
  });

  it('should parse attributes', () => {
    const xml = '<root attr1="value1" attr2="value2"></root>';
    const result = parseXml(xml);

    expect(result?.attributes).toEqual({ attr1: 'value1', attr2: 'value2' });
  });

  it('should throw on invalid XML', () => {
    const invalidXml = '<root><unclosed>';
    expect(() => parseXml(invalidXml)).toThrow();
  });
});

describe('Test Case 01: Identical Documents', () => {
  it('should find no differences for identical XMLs', () => {
    const { a, b } = loadTestCase('01-identical');
    const leftParsed = parseXml(a);
    const rightParsed = parseXml(b);
    const results = compareXml(leftParsed, rightParsed);

    expect(results).toHaveLength(0);

    const stats = getStats(results);
    expect(stats.different).toBe(0);
    expect(stats.missingLeft).toBe(0);
    expect(stats.missingRight).toBe(0);
    expect(stats.moved).toBe(0);
  });
});

describe('Test Case 02: Different Values', () => {
  it('should detect value differences', () => {
    const { a, b } = loadTestCase('02-different-values');
    const leftParsed = parseXml(a);
    const rightParsed = parseXml(b);
    const results = compareXml(leftParsed, rightParsed);

    const stats = getStats(results);
    expect(stats.different).toBe(3);

    // Check specific differences
    const priceDiff = results.find(r => r.path.includes('price'));
    expect(priceDiff).toBeDefined();
    expect(priceDiff?.leftValue).toBe('99.99');
    expect(priceDiff?.rightValue).toBe('89.99');

    const stockDiff = results.find(r => r.path.includes('stock'));
    expect(stockDiff).toBeDefined();
    expect(stockDiff?.leftValue).toBe('50');
    expect(stockDiff?.rightValue).toBe('75');

    const nameDiff = results.find(r => r.path.includes('product[2]/name'));
    expect(nameDiff).toBeDefined();
    expect(nameDiff?.leftValue).toBe('Gadget Plus');
    expect(nameDiff?.rightValue).toBe('Gadget Premium');
  });
});

describe('Test Case 03: Missing Elements', () => {
  it('should detect missing elements', () => {
    const { a, b } = loadTestCase('03-missing-elements');
    const leftParsed = parseXml(a);
    const rightParsed = parseXml(b);
    const results = compareXml(leftParsed, rightParsed);

    const stats = getStats(results);

    // cache is only in A
    expect(stats.missingRight).toBeGreaterThan(0);

    // logging and username are only in B
    expect(stats.missingLeft).toBeGreaterThan(0);

    // Check for cache (only in A)
    const cacheMissing = results.find(r =>
      r.path.includes('cache') && r.status === 'missing-right'
    );
    expect(cacheMissing).toBeDefined();

    // Check for logging (only in B)
    const loggingMissing = results.find(r =>
      r.path.includes('logging') && r.status === 'missing-left'
    );
    expect(loggingMissing).toBeDefined();

    // Check for username (only in B)
    const usernameMissing = results.find(r =>
      r.path.includes('username') && r.status === 'missing-left'
    );
    expect(usernameMissing).toBeDefined();
  });
});

describe('Test Case 04: Reordered Elements', () => {
  it('should show differences with ignoreOrder OFF', () => {
    const { a, b } = loadTestCase('04-reordered');
    const leftParsed = parseXml(a);
    const rightParsed = parseXml(b);
    const results = compareXml(leftParsed, rightParsed, { ignoreOrder: false });

    const stats = getStats(results);
    // Without ignore order, position-based comparison shows differences
    expect(stats.different).toBeGreaterThan(0);
    expect(stats.moved).toBe(0);
  });

  it('should detect moved elements with ignoreOrder ON', () => {
    const { a, b } = loadTestCase('04-reordered');
    const leftParsed = parseXml(a);
    const rightParsed = parseXml(b);
    const results = compareXml(leftParsed, rightParsed, { ignoreOrder: true });

    const stats = getStats(results);
    // With ignore order, should detect 4 moved elements
    expect(stats.moved).toBe(4);
    expect(stats.different).toBe(0);
    expect(stats.missingLeft).toBe(0);
    expect(stats.missingRight).toBe(0);

    // Check that all results are 'moved' status
    results.forEach(r => {
      expect(r.status).toBe('moved');
    });
  });
});

describe('Test Case 05: Different Attributes', () => {
  it('should detect attribute differences', () => {
    const { a, b } = loadTestCase('05-different-attributes');
    const leftParsed = parseXml(a);
    const rightParsed = parseXml(b);
    const results = compareXml(leftParsed, rightParsed);

    // Check format attribute change (hardcover -> ebook)
    const formatDiff = results.find(r => r.path.includes('@format'));
    expect(formatDiff).toBeDefined();
    expect(formatDiff?.status).toBe('different');
    expect(formatDiff?.leftValue).toBe('hardcover');
    expect(formatDiff?.rightValue).toBe('ebook');

    // Check country attribute change (US -> UK)
    const countryDiff = results.find(r => r.path.includes('@country') && r.status === 'different');
    expect(countryDiff).toBeDefined();

    // Check for new edition attribute (only in B)
    const editionMissing = results.find(r =>
      r.path.includes('@edition') && r.status === 'missing-left'
    );
    expect(editionMissing).toBeDefined();

    // Check lang attribute change (de -> en)
    const langDiff = results.find(r =>
      r.path.includes('book[2]') && r.path.includes('@lang')
    );
    expect(langDiff).toBeDefined();
  });
});

describe('Test Case 06: Complex Mixed Changes', () => {
  it('should detect multiple types of changes without ignoreOrder', () => {
    const { a, b } = loadTestCase('06-complex-mixed');
    const leftParsed = parseXml(a);
    const rightParsed = parseXml(b);
    const results = compareXml(leftParsed, rightParsed, { ignoreOrder: false });

    const stats = getStats(results);

    // Should have various types of differences
    expect(stats.different + stats.missingLeft + stats.missingRight).toBeGreaterThan(0);
  });

  it('should handle complex changes with ignoreOrder ON', () => {
    const { a, b } = loadTestCase('06-complex-mixed');
    const leftParsed = parseXml(a);
    const rightParsed = parseXml(b);
    const results = compareXml(leftParsed, rightParsed, { ignoreOrder: true });

    const stats = getStats(results);

    // Departments have content changes, so they won't be detected as "moved"
    // but the ignoreOrder should still help match them better
    // Should still detect value differences
    expect(stats.different + stats.missingLeft + stats.missingRight).toBeGreaterThan(0);

    // Check for active attribute change
    const activeDiff = results.find(r =>
      r.path.includes('@active') && r.status === 'different'
    );
    expect(activeDiff).toBeDefined();
  });
});

describe('findLineInXml', () => {
  const testXml = `<?xml version="1.0"?>
<root>
    <item id="1">
        <name>First</name>
    </item>
    <item id="2">
        <name>Second</name>
    </item>
    <item id="3">
        <name>Third</name>
    </item>
</root>`;

  it('should find the correct line for first element', () => {
    const line = findLineInXml(testXml, 'root/item', null);
    expect(line).toBe(2); // 0-indexed, line 3 is index 2
  });

  it('should find the correct line for indexed element', () => {
    const line = findLineInXml(testXml, 'root/item[2]', null);
    expect(line).toBe(5); // Second item starts at line 6 (index 5)
  });

  it('should find the correct line for third element', () => {
    const line = findLineInXml(testXml, 'root/item[3]', null);
    expect(line).toBe(8); // Third item starts at line 9 (index 8)
  });
});

describe('getStats', () => {
  it('should correctly count all statuses', () => {
    const mockResults = [
      { status: 'different' as const, path: '/a' },
      { status: 'different' as const, path: '/b' },
      { status: 'missing-left' as const, path: '/c' },
      { status: 'missing-right' as const, path: '/d' },
      { status: 'moved' as const, path: '/e' },
      { status: 'moved' as const, path: '/f' },
      { status: 'moved' as const, path: '/g' },
    ];

    const stats = getStats(mockResults);

    expect(stats.total).toBe(7);
    expect(stats.different).toBe(2);
    expect(stats.missingLeft).toBe(1);
    expect(stats.missingRight).toBe(1);
    expect(stats.moved).toBe(3);
    expect(stats.equal).toBe(0);
  });
});
