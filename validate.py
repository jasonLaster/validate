import json
import sys
import re
from typing import Union, Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


class ActionType(Enum):
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class VerifierType(Enum):
    REGEX = "regex"
    MUTATION_VARIABLE = "mutation_variable"
    SEMANTIC_MATCH_VARIABLE = "semantic_match_variable"


@dataclass
class RegexVerifier:
    type: str = "regex"
    regex: str = ""


@dataclass
class MutationVariableVerifier:
    type: str = "mutation_variable"
    name: str = ""


@dataclass
class SemanticMatchVariableVerifier:
    type: str = "semantic_match_variable"
    description: str = ""


ValueVerifier = Union[
    RegexVerifier,
    MutationVariableVerifier,
    SemanticMatchVariableVerifier,
    str,
    int,
    float,
    bool,
    None
]


@dataclass
class MutationVerifier:
    action: str
    tablename: str
    values: Optional[Dict[str, ValueVerifier]] = None
    where: Optional[Dict[str, ValueVerifier]] = None


@dataclass
class StateMutationMatchVerifier:
    type: str = "state_mutation_match"
    mutations: List[MutationVerifier] = None

    def __post_init__(self):
        if self.mutations is None:
            self.mutations = []


VerifierSpec = StateMutationMatchVerifier


@dataclass
class DiffInsert:
    table: str
    method: str = "insert"
    record: Dict[str, Any] = None

    def __post_init__(self):
        if self.record is None:
            self.record = {}


@dataclass
class DiffUpdate:
    table: str
    method: str = "update"
    where: Dict[str, Any] = None
    record: Dict[str, Any] = None

    def __post_init__(self):
        if self.where is None:
            self.where = {}
        if self.record is None:
            self.record = {}


@dataclass
class DiffDelete:
    table: str
    method: str = "delete"
    where: Dict[str, Any] = None

    def __post_init__(self):
        if self.where is None:
            self.where = {}


DiffResult = Union[DiffInsert, DiffUpdate, DiffDelete]


@dataclass
class ValidationResult:
    success: bool
    actual: Optional[DiffResult]
    expected: MutationVerifier
    type: str


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


def match_value(verifier: ValueVerifier, value: Any) -> bool:
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


def match_mutation(verifier: MutationVerifier, diff: DiffResult) -> bool:
    if (verifier.action == "INSERT" and 
        diff.method == "insert" and 
        verifier.tablename == diff.table):
        if not verifier.values:
            return True
        for k, v in verifier.values.items():
            if not match_value(v, diff.record.get(k)):
                return False
        return True
    
    if (verifier.action == "UPDATE" and 
        diff.method == "update" and 
        verifier.tablename == diff.table):
        if not verifier.values:
            return True
        for k, v in verifier.values.items():
            if not match_value(v, diff.record.get(k)):
                return False
        if verifier.where:
            for k, v in verifier.where.items():
                if not match_value(v, diff.where.get(k)):
                    return False
        return True
    
    if (verifier.action == "DELETE" and 
        diff.method == "delete" and 
        verifier.tablename == diff.table):
        if not verifier.where:
            return True
        for k, v in verifier.where.items():
            if not match_value(v, diff.where.get(k)):
                return False
        return True
    
    return False


def validate(verifier: VerifierSpec, diffs: List[DiffResult]) -> List[ValidationResult]:
    if verifier.type != "state_mutation_match":
        raise ValueError("Unsupported verifier type")
    
    results: List[ValidationResult] = []
    for mutation in verifier.mutations:
        found = None
        for diff in diffs:
            if match_mutation(mutation, diff):
                found = diff
                break
        
        results.append(ValidationResult(
            success=found is not None,
            actual=found,
            expected=mutation,
            type=mutation.action
        ))
    
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
    
    # Convert JSON data to proper objects
    mutations = []
    for mutation_data in verifier_data["mutations"]:
        mutations.append(MutationVerifier(**mutation_data))
    
    verifier = StateMutationMatchVerifier(
        type=verifier_data["type"],
        mutations=mutations
    )
    
    diffs = []
    for diff_data in diffs_data:
        if diff_data["method"] == "insert":
            diffs.append(DiffInsert(**diff_data))
        elif diff_data["method"] == "update":
            diffs.append(DiffUpdate(**diff_data))
        elif diff_data["method"] == "delete":
            diffs.append(DiffDelete(**diff_data))
    
    results = validate(verifier, diffs)
    
    for r in results:
        if r.success:
            print(f"✔ Matched mutation: {r.type} on {r.expected.tablename}")
        else:
            print(f"✘ No match for mutation: {r.type} on {r.expected.tablename}")


if __name__ == "__main__":
    main() 