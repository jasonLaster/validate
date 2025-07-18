import pytest
import sys
import io
from unittest.mock import patch
from typing import List, Dict, Any

from validate import (
    validate,
    DiffResult,
    VerifierSpec,
    ValidationResult,
    StateMutationMatchVerifier,
    MutationVerifier,
    DiffInsert,
    DiffUpdate,
    DiffDelete
)


def run_validate(verifier: VerifierSpec, diffs: List[DiffResult]) -> List[str]:
    """Run validate and capture output instead of printing"""
    results = []
    
    # Capture stdout
    captured_output = io.StringIO()
    with patch('sys.stdout', captured_output):
        # We need to modify the validate function to return results instead of printing
        # For now, we'll just call the validate function and return the results
        validation_results = validate(verifier, diffs)
        
        # Convert results to string format similar to the original
        for r in validation_results:
            if r.success:
                results.append(f"✔ Matched mutation: {r.type} on {r.expected.tablename}")
            else:
                results.append(f"✘ No match for mutation: {r.type} on {r.expected.tablename}")
    
    return results


class TestValidate:
    def test_matches_exact_insert(self):
        verifier = StateMutationMatchVerifier(
            type="state_mutation_match",
            mutations=[
                MutationVerifier(
                    action="INSERT",
                    tablename="foo",
                    values={"id": 1, "name": "bar"}
                )
            ]
        )
        
        diffs = [
            DiffInsert(table="foo", method="insert", record={"id": 1, "name": "bar"})
        ]
        
        results = validate(verifier, diffs)
        
        assert len(results) == 1
        assert results[0].success is True
        assert results[0].type == "INSERT"
        assert results[0].expected == verifier.mutations[0]
        assert results[0].actual == diffs[0]

    def test_fails_on_missing_mutation(self):
        verifier = StateMutationMatchVerifier(
            type="state_mutation_match",
            mutations=[
                MutationVerifier(
                    action="INSERT",
                    tablename="foo",
                    values={"id": 1, "name": "bar"}
                )
            ]
        )
        
        diffs = []
        
        results = validate(verifier, diffs)
        
        assert len(results) == 1
        assert results[0].success is False
        assert results[0].actual is None
        assert results[0].expected == verifier.mutations[0]
        assert results[0].type == "INSERT"

    def test_matches_regex(self):
        verifier = StateMutationMatchVerifier(
            type="state_mutation_match",
            mutations=[
                MutationVerifier(
                    action="INSERT",
                    tablename="foo",
                    values={"name": {"type": "regex", "regex": ".*bar.*"}}
                )
            ]
        )
        
        diffs = [
            DiffInsert(table="foo", method="insert", record={"name": "hello bar world"})
        ]
        
        results = validate(verifier, diffs)
        
        assert len(results) == 1
        assert results[0].success is True
        assert results[0].actual == diffs[0]
        assert results[0].expected == verifier.mutations[0]
        assert results[0].type == "INSERT"

    def test_matches_mutation_variable(self):
        verifier = StateMutationMatchVerifier(
            type="state_mutation_match",
            mutations=[
                MutationVerifier(
                    action="INSERT",
                    tablename="foo",
                    values={
                        "id": {"type": "mutation_variable", "name": "id"},
                        "name": "bar"
                    }
                )
            ]
        )
        
        diffs = [
            DiffInsert(table="foo", method="insert", record={"id": 123, "name": "bar"})
        ]
        
        results = validate(verifier, diffs)
        
        assert len(results) == 1
        assert results[0].success is True
        assert results[0].actual == diffs[0]
        assert results[0].expected == verifier.mutations[0]
        assert results[0].type == "INSERT"

    def test_matches_semantic_match_variable_placeholder(self):
        verifier = StateMutationMatchVerifier(
            type="state_mutation_match",
            mutations=[
                MutationVerifier(
                    action="INSERT",
                    tablename="foo",
                    values={
                        "name": {
                            "type": "semantic_match_variable",
                            "description": "should be bar"
                        }
                    }
                )
            ]
        )
        
        diffs = [
            DiffInsert(table="foo", method="insert", record={"name": "bar"})
        ]
        
        results = validate(verifier, diffs)
        
        assert len(results) == 1
        assert results[0].success is True
        assert results[0].actual == diffs[0]
        assert results[0].expected == verifier.mutations[0]
        assert results[0].type == "INSERT"

    def test_matches_update_with_where(self):
        verifier = StateMutationMatchVerifier(
            type="state_mutation_match",
            mutations=[
                MutationVerifier(
                    action="UPDATE",
                    tablename="foo",
                    where={"id": 1},
                    values={"name": "baz"}
                )
            ]
        )
        
        diffs = [
            DiffUpdate(
                table="foo",
                method="update",
                where={"id": 1},
                record={"name": "baz"}
            )
        ]
        
        results = validate(verifier, diffs)
        
        assert len(results) == 1
        assert results[0].success is True
        assert results[0].actual == diffs[0]
        assert results[0].expected == verifier.mutations[0]
        assert results[0].type == "UPDATE"


if __name__ == "__main__":
    pytest.main([__file__]) 