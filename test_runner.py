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
    results = fixture["results"]
    
    # Call validate with the new structure
    actual_results = validate(verifier, results)
    expected_results = fixture["expected"]
    
    # Compare the actual results with expected results
    comparison_results = {
        "fixture": os.path.basename(fixture_path),
        "actual_results": actual_results,
        "expected_results": expected_results,
        "comparisons": {}
    }
    
    # Compare overall result
    comparison_results["comparisons"]["result"] = {
        "actual": actual_results["result"],
        "expected": expected_results["result"],
        "success": actual_results["result"] == expected_results["result"]
    }
    
    # Compare total verifiers
    comparison_results["comparisons"]["totalVerifiers"] = {
        "actual": actual_results["totalVerifiers"],
        "expected": expected_results["totalVerifiers"],
        "success": actual_results["totalVerifiers"] == expected_results["totalVerifiers"]
    }
    
    # Compare passed verifiers
    comparison_results["comparisons"]["passedVerifiers"] = {
        "actual": actual_results["passedVerifiers"],
        "expected": expected_results["passedVerifiers"],
        "success": actual_results["passedVerifiers"] == expected_results["passedVerifiers"]
    }
    
    # Compare verifiers array
    actual_verifiers = actual_results["verifiers"]
    expected_verifiers = expected_results["verifiers"]
    
    verifier_comparisons = []
    for i, (actual_verifier, expected_verifier) in enumerate(zip(actual_verifiers, expected_verifiers)):
        verifier_comparison = {
            "index": i,
            "success": actual_verifier["success"] == expected_verifier["success"],
            "type": actual_verifier["type"] == expected_verifier["type"],
            "actual": actual_verifier,
            "expected": expected_verifier
        }
        verifier_comparisons.append(verifier_comparison)
    
    comparison_results["comparisons"]["verifiers"] = verifier_comparisons
    
    # Check if all comparisons passed
    all_passed = (
        comparison_results["comparisons"]["result"]["success"] and
        comparison_results["comparisons"]["totalVerifiers"]["success"] and
        comparison_results["comparisons"]["passedVerifiers"]["success"] and
        all(v["success"] and v["type"] for v in verifier_comparisons)
    )
    
    comparison_results["all_passed"] = all_passed
    
    return comparison_results


def run_all_fixture_tests() -> List[Dict[str, Any]]:
    """Run all fixture tests"""
    fixture_dir = "fixtures"
    fixture_files = glob.glob(os.path.join(fixture_dir, "*.json"))
    test_results = []
    for fixture_path in sorted(fixture_files):
        try:
            result = run_fixture_test(fixture_path)
            test_results.append(result)
            
            # Print summary
            if result["all_passed"]:
                print(f"✅ {result['fixture']}: PASS")
            else:
                print(f"❌ {result['fixture']}: FAIL")
                # Print detailed comparison failures
                comparisons = result["comparisons"]
                if not comparisons["result"]["success"]:
                    print(f"   - result: expected {comparisons['result']['expected']}, got {comparisons['result']['actual']}")
                if not comparisons["totalVerifiers"]["success"]:
                    print(f"   - totalVerifiers: expected {comparisons['totalVerifiers']['expected']}, got {comparisons['totalVerifiers']['actual']}")
                if not comparisons["passedVerifiers"]["success"]:
                    print(f"   - passedVerifiers: expected {comparisons['passedVerifiers']['expected']}, got {comparisons['passedVerifiers']['actual']}")
                for verifier_comp in comparisons["verifiers"]:
                    if not verifier_comp["success"] or not verifier_comp["type"]:
                        print(f"   - verifier[{verifier_comp['index']}]: success mismatch or type mismatch")
                        
        except Exception as e:
            print(f"❌ {os.path.basename(fixture_path)}: ERROR - {str(e)}")
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
        elif result["all_passed"]:
            passed += 1
            print(f"✅ {result['fixture']}: PASS")
        else:
            failed += 1
            print(f"❌ {result['fixture']}: FAIL")
    print(f"\n🎯 Results: {passed} passed, {failed} failed")
    if failed == 0:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    exit(main()) 