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
} from "./validate";

interface FixtureData {
  verifier: VerifierSpec;
  diffs: DiffResult[];
  expected: {
    success: boolean;
    type: string;
    matched_count: number;
  };
}

interface TestResult {
  fixture: string;
  results: ValidationResult[];
  matched_count: number;
  expected: {
    success: boolean;
    type: string;
    matched_count: number;
  };
}

function loadFixture(fixturePath: string): FixtureData {
  const content = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(content);
}

function runFixtureTest(fixturePath: string): TestResult {
  const fixture = loadFixture(fixturePath);
  const results = validate(fixture.verifier, fixture.diffs);

  // Count successful matches
  const matchedCount = results.filter((r) => r.success).length;

  return {
    fixture: path.basename(fixturePath),
    results,
    matched_count: matchedCount,
    expected: fixture.expected,
  };
}

function runAllFixtureTests(): TestResult[] {
  const fixtureDir = "fixtures";
  const fixtureFiles = fs
    .readdirSync(fixtureDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(fixtureDir, file))
    .sort();

  const testResults: TestResult[] = [];

  for (const fixturePath of fixtureFiles) {
    try {
      const result = runFixtureTest(fixturePath);
      testResults.push(result);
      console.log(
        `✅ ${result.fixture}: ${result.matched_count} matches (expected ${result.expected.matched_count})`
      );
    } catch (error) {
      console.log(`❌ ${path.basename(fixturePath)}: ${error}`);
      testResults.push({
        fixture: path.basename(fixturePath),
        results: [],
        matched_count: 0,
        expected: { success: false, type: "", matched_count: 0 },
        error: String(error),
      } as TestResult & { error: string });
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
    } else if (result.matched_count === result.expected.matched_count) {
      passed++;
      console.log(`✅ ${result.fixture}: PASS`);
    } else {
      failed++;
      console.log(
        `❌ ${result.fixture}: FAIL - Expected ${result.expected.matched_count}, got ${result.matched_count}`
      );
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
