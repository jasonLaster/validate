#!/usr/bin/env python3
"""
Shared test runner that loads JSON fixtures and runs validation tests.
This can be used by both Python and TypeScript implementations.
"""

import json
import os
import glob
from typing import Dict, Any, List
from validate import validate


def load_fixture(fixture_path: str) -> Dict[str, Any]:
    """Load a JSON fixture file"""
    with open(fixture_path, 'r') as f:
        return json.load(f)


def run_fixture_test(fixture_path: str) -> Dict[str, Any]:
    """Run a single fixture test"""
    fixture = load_fixture(fixture_path)
    verifier = fixture["verifier"]
    diffs = fixture["diffs"]
    results = validate(verifier, diffs)
    # Count successful matches
    matched_count = sum(1 for r in results if r["success"])
    return {
        "fixture": os.path.basename(fixture_path),
        "results": results,
        "matched_count": matched_count,
        "expected": fixture["expected"]
    }


def run_all_fixture_tests() -> List[Dict[str, Any]]:
    """Run all fixture tests"""
    fixture_dir = "fixtures"
    fixture_files = glob.glob(os.path.join(fixture_dir, "*.json"))
    test_results = []
    for fixture_path in sorted(fixture_files):
        try:
            result = run_fixture_test(fixture_path)
            test_results.append(result)
            print(f"✅ {result['fixture']}: {result['matched_count']} matches (expected {result['expected']['matched_count']})")
        except Exception as e:
            print(f"❌ {os.path.basename(fixture_path)}: {str(e)}")
            test_results.append({
                "fixture": os.path.basename(fixture_path),
                "error": str(e)
            })
    return test_results


def main():
    """Main test runner"""
    print("🧪 Running shared fixture tests...")
    print("=" * 50)
    results = run_all_fixture_tests()
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    passed = 0
    failed = 0
    for result in results:
        if "error" in result:
            failed += 1
            print(f"❌ {result['fixture']}: ERROR - {result['error']}")
        elif result["matched_count"] == result["expected"]["matched_count"]:
            passed += 1
            print(f"✅ {result['fixture']}: PASS")
        else:
            failed += 1
            print(f"❌ {result['fixture']}: FAIL - Expected {result['expected']['matched_count']}, got {result['matched_count']}")
    print(f"\n🎯 Results: {passed} passed, {failed} failed")
    if failed == 0:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    exit(main()) 