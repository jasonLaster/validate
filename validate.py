import json
import sys
import re
from typing import Dict, List, Any, Optional


def match_regex(value: Any, regex: str) -> bool:
    if not isinstance(value, str):
        return False
    return bool(re.match(regex, value))


def match_mutation_variable(_value: Any, _name: str) -> bool:
    # Always true, just a placeholder for variable capture
    return True


def match_semantic(_value: Any, _desc: str) -> bool:
    # Placeholder: always true, real implementation would use LLM/embedding
    return True


def match_value(verifier: Any, value: Any) -> bool:
    if isinstance(verifier, dict) and "type" in verifier:
        verifier_type = verifier["type"]
        if verifier_type == "regex":
            return match_regex(value, verifier["regex"])
        elif verifier_type == "mutation_variable":
            return match_mutation_variable(value, verifier["name"])
        elif verifier_type == "semantic_match_variable":
            return match_semantic(value, verifier["description"])
        else:
            return False
    else:
        # Literal match
        return verifier == value


def match_mutation(verifier: Dict[str, Any], diff: Dict[str, Any]) -> bool:
    if (
        verifier["action"] == "INSERT"
        and diff["method"] == "insert"
        and verifier["tablename"] == diff["table"]
    ):
        if not verifier.get("values"):
            return True
        for k, v in verifier["values"].items():
            if not match_value(v, diff["record"].get(k)):
                return False
        return True

    if (
        verifier["action"] == "UPDATE"
        and diff["method"] == "update"
        and verifier["tablename"] == diff["table"]
    ):
        if not verifier.get("values"):
            return True
        for k, v in verifier["values"].items():
            if not match_value(v, diff["record"].get(k)):
                return False
        if verifier.get("where"):
            for k, v in verifier["where"].items():
                if not match_value(v, diff["where"].get(k)):
                    return False
        return True

    if (
        verifier["action"] == "DELETE"
        and diff["method"] == "delete"
        and verifier["tablename"] == diff["table"]
    ):
        if not verifier.get("where"):
            return True
        for k, v in verifier["where"].items():
            if not match_value(v, diff["where"].get(k)):
                return False
        return True

    return False


def validate(
    verifier: Dict[str, Any], 
    results: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
    """
    Validate a verifier against a list of diffs, return_value, final_url, and agent_error.
    """

    verifier_results: List[Dict[str, Any]] = []
    for mutation in verifier["state"]["mutations"]:
        found = None
        for diff in results["state"]["mutations"]:
            if match_mutation(mutation, diff):
                found = diff
                break

        verifier_results.append({
            "success": found is not None,
            "actual": found,
            "expected": mutation,
            "type": "mutation",
        })
        
    if verifier.get("return_value") is not None:
        verifier_results.append({
            "success": match_value(verifier["return_value"], results.get("return_value")),
            "actual": results.get("return_value"),
            "expected": verifier["return_value"],
            "type": "return_value",
        })
        
    if verifier.get("final_url") is not None:
        verifier_results.append({
            "success": match_value(verifier["final_url"], results.get("final_url")),
            "actual": results.get("final_url"),
            "expected": verifier["final_url"],
            "type": "final_url",
        })
        
    if verifier.get("agent_error") is not None:
        verifier_results.append({
            "success": match_value(verifier["agent_error"], results.get("agent_error")),
            "actual": results.get("agent_error"),
            "expected": verifier["agent_error"],
            "type": "agent_error",
        })

    results = {
        "verifiers": verifier_results,
        "result": all(r["success"] for r in verifier_results),
        "totalVerifiers": len(verifier_results),
        "passedVerifiers": sum(1 for r in verifier_results if r["success"]),
    }

    return results


def main():
    if len(sys.argv) != 3:
        print("Usage: python validate.py <verifier.json> <diff.json>")
        sys.exit(1)

    verifier_path, diff_path = sys.argv[1], sys.argv[2]

    with open(verifier_path, 'r') as f:
        verifier_data = json.load(f)

    with open(diff_path, 'r') as f:
        diffs_data = json.load(f)

    verifier = verifier_data
    diffs = diffs_data

    results = validate(verifier, diffs)

    for r in results:
        if r["success"]:
            print(f"✔ Matched mutation: {r['type']} on {r['expected']['tablename']}")
        else:
            print(f"✘ No match for mutation: {r['type']} on {r['expected']['tablename']}")


if __name__ == "__main__":
    main() 