/**
 * ============================================================================
 * LAYOUT ALGORITHM REGRESSION TEST SUITE
 * ============================================================================
 *
 * Purpose: Ensures the layout algorithm works correctly after any changes.
 * Run this test suite before deploying any changes to layoutAlgorithm.ts
 *
 * How to run: npx tsx src/utils/layoutAlgorithm.regression.test.ts
 *
 * Test Coverage:
 * - Test 1-3: Grid layouts with identical images (original bug fix)
 * - Test 4: Small images (multiple per row)
 * - Test 5: Edge padding verification
 * - Test 6: Rotation optimization
 * - Test 7: Mixed image sizes (no overlaps)
 * - Test 8-9: Custom spacing values (0 and 1 inch)
 * - Test 10: Oversized images handling
 *
 * History:
 * - Created: 2025-12-12 - After fixing identical image orientation bug
 *   Bug: 4 images of 10.8"x14.4" produced 44.1" instead of 29.7"
 *   Fix: Added orientation pre-analysis for groups of identical images
 *
 * ============================================================================
 */

import { generateLayout } from './layoutAlgorithm';

const runTests = () => {
  console.log('='.repeat(60));
  console.log('LAYOUT ALGORITHM TESTS');
  console.log('='.repeat(60));

  // Test 1: Original user bug - 4 images 10.8x14.4
  const test1 = generateLayout(
    Array.from({ length: 4 }, (_, i) => ({ id: String(i+1), widthInches: 10.8, heightInches: 14.4 })),
    23, 0.3
  );
  const test1Pass = test1.totalHeightInches < 31 && test1.totalHeightInches > 29;
  console.log(`\nTest 1: 4 images 10.8x14.4 (original bug)`);
  console.log(`  Expected: ~29.7" height (2x2 grid)`);
  console.log(`  Got: ${test1.totalHeightInches.toFixed(2)}" height`);
  console.log(`  Positions: ${test1.positionedImages.map(p => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(', ')}`);
  console.log(`  ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 2: Images too wide for 2 per row - 4 images 11.35x15.14
  const test2 = generateLayout(
    Array.from({ length: 4 }, (_, i) => ({ id: String(i+1), widthInches: 11.35, heightInches: 15.14 })),
    23, 0.3
  );
  const test2Pass = test2.totalHeightInches > 60 && test2.totalHeightInches < 63;
  console.log(`\nTest 2: 4 images 11.35x15.14 (should be 1 per row)`);
  console.log(`  Expected: ~61.76" height (4 rows)`);
  console.log(`  Got: ${test2.totalHeightInches.toFixed(2)}" height`);
  console.log(`  Positions: ${test2.positionedImages.map(p => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(', ')}`);
  console.log(`  ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 3: Exactly fits 2 per row - 4 images 11x14.68
  const test3 = generateLayout(
    Array.from({ length: 4 }, (_, i) => ({ id: String(i+1), widthInches: 11, heightInches: 14.68 })),
    23, 0.3
  );
  const test3Pass = test3.totalHeightInches < 32 && test3.totalHeightInches > 29;
  console.log(`\nTest 3: 4 images 11x14.68 (exactly fits 2 per row)`);
  console.log(`  Expected: ~30.26" height (2x2 grid)`);
  console.log(`  Got: ${test3.totalHeightInches.toFixed(2)}" height`);
  console.log(`  Positions: ${test3.positionedImages.map(p => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(', ')}`);
  console.log(`  ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 4: Small images - 6 images 5x5
  const test4 = generateLayout(
    Array.from({ length: 6 }, (_, i) => ({ id: String(i+1), widthInches: 5, heightInches: 5 })),
    23, 0.3
  );
  const test4Pass = test4.totalHeightInches < 12 && test4.totalHeightInches > 10;
  console.log(`\nTest 4: 6 images 5x5 (small images)`);
  console.log(`  Expected: ~10.9" height (4+2 layout)`);
  console.log(`  Got: ${test4.totalHeightInches.toFixed(2)}" height`);
  console.log(`  Positions: ${test4.positionedImages.map(p => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(', ')}`);
  console.log(`  ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 5: Single image - verify edge padding
  const test5 = generateLayout(
    [{ id: '1', widthInches: 10, heightInches: 10 }],
    23, 0.3
  );
  const test5Pass = test5.positionedImages[0].x === 0.3 && test5.positionedImages[0].y === 0.3;
  console.log(`\nTest 5: 1 image 10x10 (edge padding check)`);
  console.log(`  Expected: position (0.3, 0.3)`);
  console.log(`  Got: position (${test5.positionedImages[0].x}, ${test5.positionedImages[0].y})`);
  console.log(`  ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 6: Rotation scenario - images that should rotate for better packing
  const test6 = generateLayout(
    Array.from({ length: 2 }, (_, i) => ({ id: String(i+1), widthInches: 15, heightInches: 11 })),
    23, 0.3
  );
  // 15" wide won't fit 2 per row, but 11" wide will
  // Expected: rotate to 11" wide, fit 2 per row
  console.log(`\nTest 6: 2 images 15x11 (should rotate to fit 2 per row)`);
  console.log(`  If portrait (15" wide): 0.3+15+0.3 = 15.6" each, 1 per row, height = 0.3+11+0.3+11+0.3 = 22.9"`);
  console.log(`  If landscape (11" wide): 0.3+11+0.3+11+0.3 = 22.9", 2 per row, height = 0.3+15+0.3 = 15.6"`);
  console.log(`  Got: ${test6.totalHeightInches.toFixed(2)}" height`);
  console.log(`  Rotated: ${test6.positionedImages.map(p => p.rotated).join(', ')}`);
  const test6Pass = test6.totalHeightInches < 17;
  console.log(`  ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 7: Mixed sizes - should not break
  const test7 = generateLayout(
    [
      { id: '1', widthInches: 10, heightInches: 12 },
      { id: '2', widthInches: 8, heightInches: 6 },
      { id: '3', widthInches: 5, heightInches: 5 },
      { id: '4', widthInches: 10, heightInches: 12 },
    ],
    23, 0.3
  );
  console.log(`\nTest 7: Mixed sizes (10x12, 8x6, 5x5, 10x12)`);
  console.log(`  Got: ${test7.totalHeightInches.toFixed(2)}" height`);
  console.log(`  Positions: ${test7.positionedImages.map(p => `${p.id}:(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(', ')}`);
  // Check no overlaps and all within bounds
  const noOverlaps = test7.positionedImages.every((p1, i) =>
    test7.positionedImages.every((p2, j) => {
      if (i >= j) return true;
      const xOverlap = p1.x < p2.x + p2.widthInches && p1.x + p1.widthInches > p2.x;
      const yOverlap = p1.y < p2.y + p2.heightInches && p1.y + p1.heightInches > p2.y;
      return !(xOverlap && yOverlap);
    })
  );
  const withinBounds = test7.positionedImages.every(p =>
    p.x >= 0.3 && p.y >= 0.3 && p.x + p.widthInches <= 22.7
  );
  const test7Pass = noOverlaps && withinBounds;
  console.log(`  No overlaps: ${noOverlaps}, Within bounds: ${withinBounds}`);
  console.log(`  ${test7Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 8: Zero spacing
  const test8 = generateLayout(
    Array.from({ length: 4 }, (_, i) => ({ id: String(i+1), widthInches: 11, heightInches: 14 })),
    23, 0
  );
  console.log(`\nTest 8: 4 images 11x14 with ZERO spacing`);
  console.log(`  Expected: 0+11+0+11+0 = 22", 2 per row, height = 0+14+0+14+0 = 28"`);
  console.log(`  Got: ${test8.totalHeightInches.toFixed(2)}" height`);
  console.log(`  First image at: (${test8.positionedImages[0].x}, ${test8.positionedImages[0].y})`);
  const test8Pass = test8.positionedImages[0].x === 0 && test8.positionedImages[0].y === 0 && test8.totalHeightInches === 28;
  console.log(`  ${test8Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 9: Large spacing (1 inch)
  const test9 = generateLayout(
    Array.from({ length: 4 }, (_, i) => ({ id: String(i+1), widthInches: 10, heightInches: 12 })),
    23, 1.0
  );
  console.log(`\nTest 9: 4 images 10x12 with 1" spacing`);
  console.log(`  Check: 1+10+1+10+1 = 23", should fit 2 per row`);
  console.log(`  Expected height: 1+12+1+12+1 = 27"`);
  console.log(`  Got: ${test9.totalHeightInches.toFixed(2)}" height`);
  console.log(`  First image at: (${test9.positionedImages[0].x}, ${test9.positionedImages[0].y})`);
  const test9Pass = test9.positionedImages[0].x === 1 && test9.totalHeightInches === 27;
  console.log(`  ${test9Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Test 10: Image wider than sheet (should scale or handle gracefully)
  const test10 = generateLayout(
    [{ id: '1', widthInches: 25, heightInches: 10 }],
    23, 0.3
  );
  console.log(`\nTest 10: 1 image 25x10 (wider than 23" sheet)`);
  console.log(`  Should handle gracefully (scale down or rotate)`);
  console.log(`  Got: ${test10.totalHeightInches.toFixed(2)}" height`);
  console.log(`  Position: (${test10.positionedImages[0].x.toFixed(2)}, ${test10.positionedImages[0].y.toFixed(2)})`);
  console.log(`  Size: ${test10.positionedImages[0].widthInches.toFixed(2)} x ${test10.positionedImages[0].heightInches.toFixed(2)}`);
  const test10Pass = test10.positionedImages[0].widthInches <= 22.4; // Within bounds
  console.log(`  ${test10Pass ? '✅ PASS' : '❌ FAIL'}`);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('ADDITIONAL TESTS SUMMARY');
  console.log('='.repeat(60));
  const allPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass && test7Pass && test8Pass && test9Pass && test10Pass;
  console.log(`\nSUMMARY: ${allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('='.repeat(60));
};

runTests();
