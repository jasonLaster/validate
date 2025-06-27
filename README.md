# Database State Mutation Validator

This project provides two main scripts for working with database state changes:

- `diff.ts`: Computes the difference (diff) between two SQLite database files and outputs the changes as structured JSON.
- `validate.ts`: Validates that a set of expected state mutations (in JSON) are present in a diff (as produced by `diff.ts`).

## Requirements

- [Bun](https://bun.sh/) runtime
- `sqldiff` (from SQLite tools) must be available in your PATH for `diff.ts`

---

## `diff.ts`

### Purpose

Generates a structured JSON diff of SQL mutations (INSERT, UPDATE, DELETE) between two SQLite database files using `sqldiff`.

### Usage

```sh
bun diff.ts <before.db> <after.db>
```

- `<before.db>`: Path to the original SQLite database file
- `<after.db>`: Path to the modified SQLite database file

### Output

Prints a JSON array of mutation objects to stdout. Each object is one of:

- Insert:
  ```json
  { "table": "foo", "method": "insert", "record": { "id": 1, "name": "bar" } }
  ```
- Update:
  ```json
  {
    "table": "foo",
    "method": "update",
    "where": { "id": 1 },
    "record": { "name": "baz" }
  }
  ```
- Delete:
  ```json
  { "table": "foo", "method": "delete", "where": { "id": 1 } }
  ```

### Example

```sh
bun diff.ts before.db after.db > diff.json
```

---

## `validate.ts`

### Purpose

Validates that a set of expected state mutations (verifier spec) are present in a diff (as produced by `diff.ts`).

### Usage

```sh
bun validate.ts <verifier.json> <diff.json>
```

- `<verifier.json>`: Path to a JSON file describing the expected mutations
- `<diff.json>`: Path to a JSON file containing the actual mutations (from `diff.ts`)

### Verifier Spec Format

A verifier spec is a JSON object like:

```json
{
  "type": "state_mutation_match",
  "mutations": [
    {
      "action": "INSERT",
      "tablename": "foo",
      "values": { "id": 1, "name": "bar" }
    },
    {
      "action": "UPDATE",
      "tablename": "foo",
      "where": { "id": 1 },
      "values": { "name": "baz" }
    }
  ]
}
```

#### Value Matchers

- Literal values (string, number, boolean, null)
- Regex match: `{ "type": "regex", "regex": "^bar.*" }`
- Mutation variable: `{ "type": "mutation_variable", "name": "id" }` (matches any value, placeholder)
- Semantic match: `{ "type": "semantic_match_variable", "description": "should be bar" }` (placeholder, always matches)

### Output

For each mutation in the verifier, prints a line:

- `✔ Matched mutation: <ACTION> on <table>` if found
- `✘ No match for mutation: <ACTION> on <table>` if not found

### Example

```sh
bun validate.ts verifier.json diff.json
```

#### Example Output

```
✔ Matched mutation: INSERT on foo
✘ No match for mutation: UPDATE on foo
```

---

## Testing

Unit tests for `validate.ts` are in `validate.test.ts` and can be run with:

```sh
bun test validate.test.ts
```

---

## License

MIT
