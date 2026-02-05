export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string | null;
  path: string;
}

export interface CompareResult {
  status: 'equal' | 'different' | 'missing-left' | 'missing-right' | 'type-mismatch' | 'moved';
  path: string;
  leftValue?: string | null;
  rightValue?: string | null;
  details?: string;
  leftIndex?: number;
  rightIndex?: number;
}

export interface CompareOptions {
  ignoreOrder?: boolean;
}

export function parseXml(xmlString: string): XmlNode | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString.trim(), 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(parseError.textContent || 'XML Parse Error');
  }

  return elementToNode(doc.documentElement, '');
}

function elementToNode(element: Element, parentPath: string): XmlNode {
  const path = parentPath ? `${parentPath}/${element.tagName}` : element.tagName;

  const attributes: Record<string, string> = {};
  for (const attr of element.attributes) {
    attributes[attr.name] = attr.value;
  }

  const children: XmlNode[] = [];
  let text: string | null = null;

  for (const child of element.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      children.push(elementToNode(child as Element, path));
    } else if (child.nodeType === Node.TEXT_NODE) {
      const trimmed = child.textContent?.trim();
      if (trimmed) {
        text = text ? text + trimmed : trimmed;
      }
    }
  }

  return { name: element.tagName, attributes, children, text, path };
}

export function compareXml(left: XmlNode | null, right: XmlNode | null, options: CompareOptions = {}): CompareResult[] {
  const results: CompareResult[] = [];

  if (!left && !right) return results;
  if (!left) {
    results.push({ status: 'missing-left', path: right!.path, rightValue: right!.name });
    return results;
  }
  if (!right) {
    results.push({ status: 'missing-right', path: left.path, leftValue: left.name });
    return results;
  }

  compareNodes(left, right, results, options);
  return results;
}

function compareNodes(left: XmlNode, right: XmlNode, results: CompareResult[], options: CompareOptions = {}): void {
  // Compare element names
  if (left.name !== right.name) {
    results.push({
      status: 'type-mismatch',
      path: left.path,
      leftValue: left.name,
      rightValue: right.name,
      details: 'Element names differ'
    });
    return;
  }

  // Compare attributes
  const allAttrKeys = new Set([...Object.keys(left.attributes), ...Object.keys(right.attributes)]);
  for (const key of allAttrKeys) {
    const leftVal = left.attributes[key];
    const rightVal = right.attributes[key];

    if (leftVal === undefined) {
      results.push({
        status: 'missing-left',
        path: `${left.path}[@${key}]`,
        rightValue: rightVal
      });
    } else if (rightVal === undefined) {
      results.push({
        status: 'missing-right',
        path: `${left.path}[@${key}]`,
        leftValue: leftVal
      });
    } else if (leftVal !== rightVal) {
      results.push({
        status: 'different',
        path: `${left.path}[@${key}]`,
        leftValue: leftVal,
        rightValue: rightVal
      });
    }
  }

  // Compare text content
  if (left.text !== right.text) {
    if (left.text || right.text) {
      results.push({
        status: 'different',
        path: `${left.path}/text()`,
        leftValue: left.text,
        rightValue: right.text
      });
    }
  }

  // Compare children
  const leftChildMap = groupChildrenByName(left.children);
  const rightChildMap = groupChildrenByName(right.children);

  const allChildNames = new Set([...leftChildMap.keys(), ...rightChildMap.keys()]);

  for (const name of allChildNames) {
    const leftChildren = leftChildMap.get(name) || [];
    const rightChildren = rightChildMap.get(name) || [];

    if (options.ignoreOrder) {
      // Match children by content fingerprint instead of position
      compareChildrenIgnoreOrder(left.path, name, leftChildren, rightChildren, results, options);
    } else {
      // Original position-based comparison
      const maxLen = Math.max(leftChildren.length, rightChildren.length);

      for (let i = 0; i < maxLen; i++) {
        const leftChild = leftChildren[i];
        const rightChild = rightChildren[i];

        if (!leftChild) {
          results.push({
            status: 'missing-left',
            path: `${left.path}/${name}[${i + 1}]`,
            rightValue: name
          });
        } else if (!rightChild) {
          results.push({
            status: 'missing-right',
            path: `${left.path}/${name}[${i + 1}]`,
            leftValue: name
          });
        } else {
          compareNodes(
            { ...leftChild, path: `${left.path}/${name}${maxLen > 1 ? `[${i + 1}]` : ''}` },
            { ...rightChild, path: `${left.path}/${name}${maxLen > 1 ? `[${i + 1}]` : ''}` },
            results,
            options
          );
        }
      }
    }
  }
}

/**
 * Create a fingerprint for an XML node based on its content
 */
function getNodeFingerprint(node: XmlNode): string {
  const parts: string[] = [node.name];

  // Add sorted attributes
  const attrKeys = Object.keys(node.attributes).sort();
  for (const key of attrKeys) {
    parts.push(`@${key}=${node.attributes[key]}`);
  }

  // Add text content
  if (node.text) {
    parts.push(`text:${node.text}`);
  }

  // Add children fingerprints (sorted for order-independent comparison)
  const childFingerprints = node.children.map(getNodeFingerprint).sort();
  parts.push(...childFingerprints);

  return parts.join('|');
}

/**
 * Compare children ignoring order - match by content fingerprint
 */
function compareChildrenIgnoreOrder(
  parentPath: string,
  childName: string,
  leftChildren: XmlNode[],
  rightChildren: XmlNode[],
  results: CompareResult[],
  options: CompareOptions
): void {
  // Create fingerprints for all children
  const leftFingerprints = leftChildren.map((child, idx) => ({
    node: child,
    fingerprint: getNodeFingerprint(child),
    index: idx
  }));

  const rightFingerprints = rightChildren.map((child, idx) => ({
    node: child,
    fingerprint: getNodeFingerprint(child),
    index: idx
  }));

  const matchedLeft = new Set<number>();
  const matchedRight = new Set<number>();

  // First pass: find exact matches and detect moves
  for (let li = 0; li < leftFingerprints.length; li++) {
    const leftItem = leftFingerprints[li];

    for (let ri = 0; ri < rightFingerprints.length; ri++) {
      if (matchedRight.has(ri)) continue;

      const rightItem = rightFingerprints[ri];

      if (leftItem.fingerprint === rightItem.fingerprint) {
        matchedLeft.add(li);
        matchedRight.add(ri);

        // Check if position changed
        if (li !== ri) {
          results.push({
            status: 'moved',
            path: `${parentPath}/${childName}`,
            leftValue: `Position ${li + 1}`,
            rightValue: `Position ${ri + 1}`,
            leftIndex: li + 1,
            rightIndex: ri + 1,
            details: `Element moved from position ${li + 1} to ${ri + 1}`
          });
        }
        break;
      }
    }
  }

  // Second pass: compare unmatched elements (these have actual differences)
  const unmatchedLeft = leftFingerprints.filter((_, i) => !matchedLeft.has(i));
  const unmatchedRight = rightFingerprints.filter((_, i) => !matchedRight.has(i));

  // Try to pair unmatched elements for detailed comparison
  const maxUnmatched = Math.max(unmatchedLeft.length, unmatchedRight.length);

  for (let i = 0; i < maxUnmatched; i++) {
    const leftItem = unmatchedLeft[i];
    const rightItem = unmatchedRight[i];

    if (!leftItem) {
      results.push({
        status: 'missing-left',
        path: `${parentPath}/${childName}[${rightItem.index + 1}]`,
        rightValue: childName,
        rightIndex: rightItem.index + 1
      });
    } else if (!rightItem) {
      results.push({
        status: 'missing-right',
        path: `${parentPath}/${childName}[${leftItem.index + 1}]`,
        leftValue: childName,
        leftIndex: leftItem.index + 1
      });
    } else {
      // Both exist but are different - do detailed comparison
      compareNodes(
        { ...leftItem.node, path: `${parentPath}/${childName}[${leftItem.index + 1}]` },
        { ...rightItem.node, path: `${parentPath}/${childName}[${rightItem.index + 1}]` },
        results,
        options
      );
    }
  }
}

function groupChildrenByName(children: XmlNode[]): Map<string, XmlNode[]> {
  const map = new Map<string, XmlNode[]>();
  for (const child of children) {
    const existing = map.get(child.name) || [];
    existing.push(child);
    map.set(child.name, existing);
  }
  return map;
}

export function getStats(results: CompareResult[]): {
  total: number;
  equal: number;
  different: number;
  missingLeft: number;
  missingRight: number;
  moved: number;
} {
  return {
    total: results.length,
    equal: results.filter(r => r.status === 'equal').length,
    different: results.filter(r => r.status === 'different').length,
    missingLeft: results.filter(r => r.status === 'missing-left').length,
    missingRight: results.filter(r => r.status === 'missing-right').length,
    moved: results.filter(r => r.status === 'moved').length
  };
}

/**
 * Parse path segments with indices, e.g. "persons/person[5]/name" -> [{name: "persons", index: 1}, {name: "person", index: 5}, {name: "name", index: 1}]
 */
function parsePathSegments(path: string): Array<{ name: string; index: number; isAttribute?: boolean; attrName?: string }> {
  const segments: Array<{ name: string; index: number; isAttribute?: boolean; attrName?: string }> = [];
  const parts = path.split('/');

  for (const part of parts) {
    if (part === 'text()') continue;

    // Check for attribute like [@category]
    const attrMatch = part.match(/^(.+?)\[@(\w+)\]$/);
    if (attrMatch) {
      const [, baseName, attrName] = attrMatch;
      const indexMatch = baseName.match(/^(.+?)\[(\d+)\]$/);
      if (indexMatch) {
        segments.push({ name: indexMatch[1], index: parseInt(indexMatch[2], 10), isAttribute: true, attrName });
      } else {
        segments.push({ name: baseName, index: 1, isAttribute: true, attrName });
      }
      continue;
    }

    // Check for index like [5]
    const indexMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (indexMatch) {
      segments.push({ name: indexMatch[1], index: parseInt(indexMatch[2], 10) });
    } else {
      segments.push({ name: part, index: 1 });
    }
  }

  return segments;
}

/**
 * Find line number in XML text based on path - follows the path with correct indices
 */
export function findLineInXml(xmlText: string, path: string, _value?: string | null): number {
  const lines = xmlText.split('\n');
  const segments = parsePathSegments(path);

  if (segments.length === 0) return 0;

  let currentLine = 0;

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    const isLast = segIdx === segments.length - 1;
    let occurrenceCount = 0;

    // Search for the n-th occurrence of this element
    for (let i = currentLine; i < lines.length; i++) {
      const line = lines[i];

      // Match opening tag: <elementName or <elementName> or <elementName ...
      const openTagPattern = new RegExp(`<${escapeRegex(segment.name)}(?:\\s|>|/)`);

      if (openTagPattern.test(line)) {
        occurrenceCount++;

        if (occurrenceCount === segment.index) {
          // Found the right occurrence
          if (isLast) {
            // If looking for attribute, stay on this line (attributes are usually on the same line or nearby)
            if (segment.isAttribute && segment.attrName) {
              // Check if attribute is on this line
              if (line.includes(segment.attrName)) {
                return i;
              }
              // Check next few lines for multi-line tags
              for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                if (lines[j].includes(segment.attrName!)) {
                  return j;
                }
              }
            }
            return i;
          }
          // Move search position to after this line for next segment
          currentLine = i + 1;
          break;
        }
      }
    }
  }

  // If path ends with text(), find the value line within the last found element
  if (path.endsWith('/text()') && segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    let occurrenceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const openTagPattern = new RegExp(`<${escapeRegex(lastSegment.name)}(?:\\s|>|/)`);

      if (openTagPattern.test(lines[i])) {
        occurrenceCount++;

        if (occurrenceCount === lastSegment.index) {
          // Return this line (text content is often on same line or next line)
          return i;
        }
      }
    }
  }

  return Math.max(0, currentLine - 1);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
