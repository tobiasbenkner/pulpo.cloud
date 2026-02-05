export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string | null;
  path: string;
}

export interface CompareResult {
  status: 'equal' | 'different' | 'missing-left' | 'missing-right' | 'type-mismatch';
  path: string;
  leftValue?: string | null;
  rightValue?: string | null;
  details?: string;
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

export function compareXml(left: XmlNode | null, right: XmlNode | null): CompareResult[] {
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

  compareNodes(left, right, results);
  return results;
}

function compareNodes(left: XmlNode, right: XmlNode, results: CompareResult[]): void {
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
          results
        );
      }
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
} {
  return {
    total: results.length,
    equal: results.filter(r => r.status === 'equal').length,
    different: results.filter(r => r.status === 'different').length,
    missingLeft: results.filter(r => r.status === 'missing-left').length,
    missingRight: results.filter(r => r.status === 'missing-right').length
  };
}
