# Database Validation System

This project provides a validation system for database mutations with support for both TypeScript and Python implementations.

## Features

- **State Mutation Matching**: Validate that database operations match expected patterns
- **Flexible Matching**: Support for exact matches, regex patterns, and semantic matching
- **Multiple Languages**: Both TypeScript and Python implementations available
- **Comprehensive Testing**: Full test suites for both implementations

## Supported Verifier Types

### Exact Matches

```json
{
  "action": "INSERT",
  "tablename": "users",
  "values": {
    "id": 1,
    "name": "John Doe"
  }
}
```

### Regex Patterns

```json
{
  "action": "INSERT",
  "tablename": "users",
  "values": {
    "email": {
      "type": "regex",
      "regex": ".*@example\\.com"
    }
  }
}
```

### Mutation Variables

```json
{
  "action": "INSERT",
  "tablename": "users",
  "values": {
    "id": {
      "type": "mutation_variable",
      "name": "user_id"
    }
  }
}
```

### Semantic Matching

```json
{
  "action": "INSERT",
  "tablename": "users",
  "values": {
    "name": {
      "type": "semantic_match_variable",
      "description": "should be a person's name"
    }
  }
}
```

## Usage

### TypeScript Version

```bash
# Run tests
bun test validate.test.ts

# Run validation
bun validate.ts <verifier.json> <diff.json>
```

### Python Version

```bash
# Install dependencies
pip install pytest

# Run tests
python -m pytest validate_test.py -v

# Run validation
python validate.py <verifier.json> <diff.json>
```

## Example

### Verifier JSON (test_verifier.json)

```json
{
  "type": "state_mutation_match",
  "mutations": [
    {
      "action": "INSERT",
      "tablename": "users",
      "values": {
        "id": 1,
        "name": "John Doe",
        "email": {
          "type": "regex",
          "regex": ".*@example\\.com"
        }
      }
    },
    {
      "action": "UPDATE",
      "tablename": "users",
      "where": {
        "id": 1
      },
      "values": {
        "name": "Jane Doe"
      }
    }
  ]
}
```

### Diff JSON (test_diff.json)

```json
[
  {
    "table": "users",
    "method": "insert",
    "record": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  {
    "table": "users",
    "method": "update",
    "where": {
      "id": 1
    },
    "record": {
      "name": "Jane Doe"
    }
  }
]
```

### Running Validation

```bash
# TypeScript
bun validate.ts test_verifier.json test_diff.json

# Python
python validate.py test_verifier.json test_diff.json
```

Both will output:

```
✔ Matched mutation: INSERT on users
✔ Matched mutation: UPDATE on users
```

## Architecture

Both implementations follow the same architecture:

1. **VerifierSpec**: Defines expected database mutations
2. **DiffResult**: Represents actual database operations
3. **ValidationResult**: Contains validation results with success/failure status
4. **Matching Functions**: Handle different types of value matching (exact, regex, semantic)

## Testing

Both implementations include comprehensive test suites covering:

- Exact value matching
- Missing mutation detection
- Regex pattern matching
- Mutation variable matching
- Semantic matching (placeholder)
- Update operations with WHERE clauses

### Shared JSON Fixtures

Both test suites use shared JSON fixtures to ensure consistency:

- `fixtures/` - Directory containing all test fixtures
- `test_runner.py` - Python test runner for JSON fixtures
- `test_runner.ts` - TypeScript test runner for JSON fixtures

The JSON fixtures provide reusable test data for:

- Verifier specifications (exact matches, regex, mutation variables, etc.)
- Diff data (inserts, updates, deletes)
- Expected results for validation

Each fixture file contains:

```json
{
  "verifier": {
    /* verifier specification */
  },
  "diffs": [
    /* array of diff objects */
  ],
  "expected": {
    /* expected test results */
  }
}
```

Run tests with:

```bash
# TypeScript
bun test validate.test.ts

# Python
python -m pytest validate_test.py -v

# Shared test runners (runs all JSON fixtures)
python test_runner.py
bun test_runner.ts
```
