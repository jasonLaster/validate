#!/usr/bin/env bun
/**
 * Shared test runner that loads JSON fixtures and runs validation tests.
 * This can be used by both Python and TypeScript implementations.
 */

import fs from "fs";
import path from "path";
import {
  validate,
  DiffResult,
  VerifierSpec,
  ValidationResult,
  ResultsData,
  VerifierResult,
} from "./validate";

interface FixtureData {
  verifier: VerifierSpec;
  results: ResultsData;
  expected: {
    verifiers: Array<{
      success: boolean;
      actual: any;
      expected: any;
      type: string;
    }>;
    result: boolean;
    totalVerifiers: number;
    passedVerifiers: number;
    matched_count: number;
  };
}

interface ComparisonResult {
  fixture: string;
  actual_results: ValidationResult;
  expected_results: FixtureData["expected"];
  comparisons: {
    result: {
      actual: boolean;
      expected: boolean;
      success: boolean;
    };
    totalVerifiers: {
      actual: number;
      expected: number;
      success: boolean;
    };
    passedVerifiers: {
      actual: number;
      expected: number;
      success: boolean;
    };
    verifiers: Array<{
      index: number;
      success: boolean;
      type: boolean;
      actual: VerifierResult | null;
      expected: any;
    }>;
  };
  all_passed: boolean;
}

function loadFixture(fixturePath: string): FixtureData {
  const content = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(content);
}

function runFixtureTest(fixturePath: string): ComparisonResult {
  const fixture = loadFixture(fixturePath);
  const verifier = fixture.verifier;
  const results = fixture.results;

  // Call validate with the new structure
  const actualResults = validate(verifier, results);
  const expectedResults = fixture.expected;

  // Compare the actual results with expected results
  const comparisonResults: ComparisonResult = {
    fixture: path.basename(fixturePath),
    actual_results: actualResults,
    expected_results: expectedResults,
    comparisons: {
      result: {
        actual: actualResults.result,
        expected: expectedResults.result,
        success: actualResults.result === expectedResults.result,
      },
      totalVerifiers: {
        actual: actualResults.totalVerifiers,
        expected: expectedResults.totalVerifiers,
        success:
          actualResults.totalVerifiers === expectedResults.totalVerifiers,
      },
      passedVerifiers: {
        actual: actualResults.passedVerifiers,
        expected: expectedResults.passedVerifiers,
        success:
          actualResults.passedVerifiers === expectedResults.passedVerifiers,
      },
      verifiers: [],
    },
    all_passed: false,
  };

  // Compare verifiers array
  const actualVerifiers = actualResults.verifiers;
  const expectedVerifiers = expectedResults.verifiers;

  const verifierComparisons: ComparisonResult["comparisons"]["verifiers"] = [];
  for (
    let i = 0;
    i < Math.max(actualVerifiers.length, expectedVerifiers.length);
    i++
  ) {
    const actualVerifier = actualVerifiers[i];
    const expectedVerifier = expectedVerifiers[i];

    if (actualVerifier && expectedVerifier) {
      verifierComparisons.push({
        index: i,
        success: actualVerifier.success === expectedVerifier.success,
        type: actualVerifier.type === expectedVerifier.type,
        actual: actualVerifier,
        expected: expectedVerifier,
      });
    } else {
      // Handle case where arrays have different lengths
      verifierComparisons.push({
        index: i,
        success: false,
        type: false,
        actual: actualVerifier || null,
        expected: expectedVerifier || null,
      });
    }
  }

  comparisonResults.comparisons.verifiers = verifierComparisons;

  // Check if all comparisons passed
  const allPassed =
    comparisonResults.comparisons.result.success &&
    comparisonResults.comparisons.totalVerifiers.success &&
    comparisonResults.comparisons.passedVerifiers.success &&
    verifierComparisons.every((v) => v.success && v.type);

  comparisonResults.all_passed = allPassed;

  return comparisonResults;
}

function runAllFixtureTests(): (
  | ComparisonResult
  | { fixture: string; error: string }
)[] {
  const fixtureDir = "fixtures";
  const fixtureFiles = fs
    .readdirSync(fixtureDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(fixtureDir, file))
    .sort();

  const testResults: (ComparisonResult | { fixture: string; error: string })[] =
    [];

  for (const fixturePath of fixtureFiles) {
    try {
      const result = runFixtureTest(fixturePath);
      testResults.push(result);

      // Print summary
      if (result.all_passed) {
        console.log(`✅ ${result.fixture}: PASS`);
      } else {
        console.log(`❌ ${result.fixture}: FAIL`);
        // Print detailed comparison failures
        const comparisons = result.comparisons;
        if (!comparisons.result.success) {
          console.log(
            `   - result: expected ${comparisons.result.expected}, got ${comparisons.result.actual}`
          );
        }
        if (!comparisons.totalVerifiers.success) {
          console.log(
            `   - totalVerifiers: expected ${comparisons.totalVerifiers.expected}, got ${comparisons.totalVerifiers.actual}`
          );
        }
        if (!comparisons.passedVerifiers.success) {
          console.log(
            `   - passedVerifiers: expected ${comparisons.passedVerifiers.expected}, got ${comparisons.passedVerifiers.actual}`
          );
        }
        for (const verifierComp of comparisons.verifiers) {
          if (!verifierComp.success || !verifierComp.type) {
            console.log(
              `   - verifier[${verifierComp.index}]: success mismatch or type mismatch`
            );
          }
        }
      }
    } catch (error) {
      console.log(`❌ ${path.basename(fixturePath)}: ERROR - ${error}`);
      testResults.push({
        fixture: path.basename(fixturePath),
        error: String(error),
      });
    }
  }

  return testResults;
}

function main(): number {
  console.log("🧪 Running shared fixture tests...");
  console.log("=".repeat(50));

  const results = runAllFixtureTests();

  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Summary:");

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if ("error" in result) {
      failed++;
      console.log(`❌ ${result.fixture}: ERROR - ${result.error}`);
    } else if (result.all_passed) {
      passed++;
      console.log(`✅ ${result.fixture}: PASS`);
    } else {
      failed++;
      console.log(`❌ ${result.fixture}: FAIL`);
    }
  }

  console.log(`\n🎯 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("🎉 All tests passed!");
    return 0;
  } else {
    console.log("💥 Some tests failed!");
    return 1;
  }
}

if (require.main === module || (import.meta && import.meta.main)) {
  process.exit(main());
}
