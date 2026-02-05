# XML Compare Test Cases

## Test Case 01: Identical Documents
**Files:** `01-identical.a.xml`, `01-identical.b.xml`
**Expected Result:** "Identical" checkmark, no differences
**Tests:** Basic comparison of identical XML structures

---

## Test Case 02: Different Values
**Files:** `02-different-values.a.xml`, `02-different-values.b.xml`
**Expected Result:** 3 differences found
- `products/product/price`: 99.99 → 89.99
- `products/product/stock`: 50 → 75
- `products/product[2]/name`: "Gadget Plus" → "Gadget Premium"

**Tests:** Value comparison within elements

---

## Test Case 03: Missing Elements
**Files:** `03-missing-elements.a.xml`, `03-missing-elements.b.xml`
**Expected Result:** Mix of "Only in A" and "Only in B"
- `cache` section only in A
- `username` element only in B
- `logging` section only in B

**Tests:** Detection of missing/extra elements

---

## Test Case 04: Reordered Elements
**Files:** `04-reordered.a.xml`, `04-reordered.b.xml`
**Expected Result:**
- **With "Ignore Order" OFF:** Many differences (position-based comparison)
- **With "Ignore Order" ON:** 4 "Moved" items, "Identical" checkmark

**Tests:** Order-independent comparison feature

---

## Test Case 05: Different Attributes
**Files:** `05-different-attributes.a.xml`, `05-different-attributes.b.xml`
**Expected Result:** Multiple attribute differences
- `format`: hardcover → ebook
- `country`: US → UK
- `lang`: de → en
- `edition` attribute only in B
- `year`: 2019 → 2021

**Tests:** Attribute comparison and detection of new/missing attributes

---

## Test Case 06: Complex Mixed Changes
**Files:** `06-complex-mixed.a.xml`, `06-complex-mixed.b.xml`
**Expected Result:** Combination of all difference types
- Reordered departments (D001 ↔ D002)
- Changed attribute: `active="true"` → `active="false"`
- Changed values: budget, position, salary
- Missing employee (E002 Bob Smith)
- New employee (E005 Eve Green)
- Reordered employees within departments

**Tests:**
- **Without "Ignore Order":** Shows many positional differences
- **With "Ignore Order":** Shows structural differences more clearly, moved elements highlighted

---

## How to Test

1. Open http://localhost:4321/
2. Load file A using "Load File" button on left editor
3. Load file B using "Load File" button on right editor
4. Click "Compare"
5. For test case 04 and 06, toggle "Ignore Order" and compare again
