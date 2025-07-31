# Database Validation System

This project provides a validation system for database mutations with support for both TypeScript and Python implementations.

## Features

- **State Mutation Matching**: Validate that database operations match expected patterns
- **Flexible Matching**: Support for exact matches, regex patterns, and semantic matching
- **Optional Field Validation**: Support for `return_value`, `final_url`, and `agent_error` validation
- **Multiple Languages**: Both TypeScript and Python implementations available
- **Comprehensive Testing**: Full test suites for both implementations with detailed validation

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

## Structure

The validation system uses a structured format with mutations and optional fields:

### Verifier Structure

```json
{
  "type": "state_mutation_match",
  "mutations": [
    {
      "action": "INSERT",
      "tablename": "users",
      "values": {
        "id": 1,
        "name": "John Doe"
      }
    }
  ],
  "return_value": "success",
  "final_url": "https://example.com/result",
  "agent_error": false
}
```

### Results Structure

```json
{
  "state": {
    "mutations": [
      {
        "table": "users",
        "method": "insert",
        "record": {
          "id": 1,
          "name": "John Doe"
        }
      }
    ]
  },
  "return_value": "success",
  "final_url": "https://example.com/result",
  "agent_error": false
}
```

## Usage

### Unified Test Runner (Recommended)

```bash
# Run all tests (Python + TypeScript)
./run_tests.sh

# Via npm
npm test

# Individual test suites
npm run test:python
npm run test:typescript
```

### Individual Runners

#### TypeScript Version

```bash
# Run tests
bun test_runner.ts

# Run validation
bun validate.ts <verifier.json> <results.json>
```

#### Python Version

```bash
# Run tests
python test_runner.py

# Run validation
python validate.py <verifier.json> <results.json>
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
  ],
  "return_value": "success",
  "final_url": "https://example.com/result",
  "agent_error": false
}
```

### Results JSON (test_results.json)

```json
{
  "state": {
    "mutations": [
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
  },
  "return_value": "success",
  "final_url": "https://example.com/result",
  "agent_error": false
}
```

### Running Validation

```bash
# TypeScript
bun validate.ts test_verifier.json test_results.json

# Python
python validate.py test_verifier.json test_results.json
```

Both will output:

```
✔ Matched mutation: users
✔ Matched return_value: success
✔ Matched final_url: https://example.com/result
✔ Matched agent_error: false
```

## Validation Results

The validation system returns comprehensive results:

```json
{
  "verifiers": [
    {
      "success": true,
      "actual": {
        /* actual diff or value */
      },
      "expected": {
        /* expected mutation or value */
      },
      "type": "mutation"
    },
    {
      "success": true,
      "actual": "success",
      "expected": "success",
      "type": "return_value"
    }
  ],
  "result": true,
  "totalVerifiers": 2,
  "passedVerifiers": 2
}
```

## Architecture

Both implementations follow the same architecture:

1. **VerifierSpec**: Defines expected database mutations with optional fields
2. **ResultsData**: Represents actual database operations and optional values
3. **ValidationResult**: Contains comprehensive validation results with detailed verifier information
4. **Matching Functions**: Handle different types of value matching (exact, regex, semantic)

## Testing

Both implementations include comprehensive test suites covering:

- Exact value matching
- Missing mutation detection
- Regex pattern matching
- Mutation variable matching
- Semantic matching (placeholder)
- Update operations with WHERE clauses
- Optional field validation (`return_value`, `final_url`, `agent_error`)
- Combined field validation
- Failure case testing

### Shared JSON Fixtures

Both test suites use shared JSON fixtures to ensure consistency:

- `fixtures/` - Directory containing all test fixtures
- `test_runner.py` - Python test runner for JSON fixtures
- `test_runner.ts` - TypeScript test runner for JSON fixtures

The JSON fixtures provide reusable test data for:

- Verifier specifications (exact matches, regex, mutation variables, etc.)
- Results data (inserts, updates, deletes with optional fields)
- Expected results for comprehensive validation

Each fixture file contains:

```json
{
  "verifier": {
    "type": "state_mutation_match",
    "mutations": [
      /* array of mutation verifiers */
    ],
    "return_value": "success",
    "final_url": "https://example.com/result",
    "agent_error": false
  },
  "results": {
    "state": {
      "mutations": [
        /* array of actual diffs */
      ]
    },
    "return_value": "success",
    "final_url": "https://example.com/result",
    "agent_error": false
  },
  "expected": {
    "verifiers": [
      /* array of expected verifier results */
    ],
    "result": true,
    "totalVerifiers": 4,
    "passedVerifiers": 4,
    "matched_count": 4
  }
}
```

### Test Runners

The test runners provide comprehensive validation:

- **Field-level Comparison**: Tests `result`, `totalVerifiers`, `passedVerifiers`
- **Verifier-level Testing**: Tests individual verifiers for success and type matching
- **Detailed Error Reporting**: Shows exactly which field failed and expected vs actual values
- **Robust Error Handling**: Handles missing fields and type mismatches

Run tests with:

```bash
# Unified test runner (recommended)
./run_tests.sh

# Individual runners
bun test_runner.ts
python test_runner.py
```

The unified test runner will output detailed results:

```
🧪 Running all test suites...
==================================================
🐍 Running Python tests...
----------------------------------------
🧪 Running shared fixture tests...
==================================================
✅ agent_error.json: PASS
✅ all_fields.json: PASS
...

🦕 Running TypeScript tests...
----------------------------------------
🧪 Running shared fixture tests...
==================================================
✅ agent_error.json: PASS
✅ all_fields.json: PASS
...

==================================================
📊 Test Summary:
✅ Python: All tests passed
✅ TypeScript: All tests passed

✅ 🎉 All test suites passed!
```

## Test Runner Features

The unified test runner (`run_tests.sh`) provides:

- 🐍 **Python Tests**: Runs `python test_runner.py`
- 🦕 **TypeScript Tests**: Runs `bun test_runner.ts`
- 🎨 **Colored Output**: Uses ANSI colors for better readability
- 🔍 **Smart Detection**: Automatically detects available runtimes
- 📊 **Unified Summary**: Provides overall pass/fail status
- ⚠️ **Graceful Fallback**: Runs Python-only if Bun isn't available
- 🚦 **Exit Codes**: Returns 0 for success, 1 for failure

## Available Fixtures

The test suite includes comprehensive fixtures:

- **exact_insert.json** - Basic INSERT test
- **missing_mutation.json** - Test for missing mutations
- **mutation_variable.json** - Test with variable matching
- **regex_match.json** - Test with regex pattern matching
- **semantic_match.json** - Test with semantic matching
- **update_with_where.json** - Test UPDATE with WHERE clause
- **return_value.json** - Test return value validation
- **final_url.json** - Test final URL validation
- **agent_error.json** - Test agent error validation
- **all_fields.json** - Test all optional fields together
- **return_value_failure.json** - Test return value failure case
