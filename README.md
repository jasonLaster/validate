# Database State Mutation Validator

This project provides two main scripts for working with database state changes:

- `diff.ts`: Computes the difference (diff) between two SQLite database files and outputs the changes as structured JSON.
- `validate.ts`: Validates that a set of expected state mutations (in JSON) are present in a diff (as produced by `diff.ts`).

## Requirements

- [Bun](https://bun.sh/) runtime
- `sqldiff` (from SQLite tools) must be available in your PATH for `diff.ts`

**sqldiff is required for diff.ts.**
Install it on macOS with:

```sh
brew install sqldiff
```

This will make the `sqldiff` command available in your PATH.

**Obtaining Database Files:**
If you are working in a development environment where the database is managed by a live store, you can download the SQLite database files using:

```js
await __debugLiveStore.default._dev.downloadDb();
```

This will save the current state of the database to a `.db` file, which you can then use with `diff.ts`.

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

e.g. `bun diff.ts ./data/before.db ./data/after.db`

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

Based on Plato.so's verifier format [link](https://www.notion.so/Plato-so-tasks-20aa334e229080398a21fca01a2bac23)

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

#### How Value Matching Works

Each mutation in the verifier describes an **expected** change. The validator checks the list of **actual** changes (from the diff) to see if any match the expected mutation. For each mutation:

- **expected**: The mutation as described in the verifier spec (what you want to see happen).
- **actual**: The matching mutation found in the diff (what actually happened), or `null` if not found.

A match is determined by comparing the fields in the verifier to those in the diff:

- For `INSERT`, the `tablename` and all specified `values` must match.
- For `UPDATE`, the `tablename`, all specified `where` conditions, and all specified `values` must match.
- For `DELETE`, the `tablename` and all specified `where` conditions must match.

#### Value Matchers

- **Literal values**: Direct equality (e.g., `"id": 1` matches only if the actual value is `1`).
- **Regex match**: `{ "type": "regex", "regex": "^bar.*" }` matches any string value starting with "bar".
- **Mutation variable**: `{ "type": "mutation_variable", "name": "id" }` matches any value (acts as a wildcard, useful for ignoring specific values).
- **Semantic match**: `{ "type": "semantic_match_variable", "description": "should be bar" }` always matches (placeholder for future semantic checks).

##### Example: Matching Behavior

If your verifier contains:

```json
{
  "action": "INSERT",
  "tablename": "foo",
  "values": {
    "id": { "type": "mutation_variable", "name": "id" },
    "name": "bar"
  }
}
```

And the diff contains:

```json
{ "table": "foo", "method": "insert", "record": { "id": 42, "name": "bar" } }
```

This is considered a match, because `id` is a mutation variable (matches any value), and `name` matches exactly.

### Output

For each mutation in the verifier, prints a line:

- `✔ Matched mutation: <ACTION> on <table>` if found
- `✘ No match for mutation: <ACTION> on <table>` if not found

### Example

```sh
bun validate.ts ./data/verifier.json ./data/diff.json
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
