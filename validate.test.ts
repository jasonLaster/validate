import { describe, it, expect } from "bun:test";
import {
  validate,
  DiffResult,
  VerifierSpec,
  ValidationResult,
} from "./validate";

function runValidate(verifier: VerifierSpec, diffs: DiffResult[]): string[] {
  const results: string[] = [];
  // Patch validate to push to results instead of console.log
  const origLog = console.log;
  console.log = (msg: string) => results.push(msg);
  try {
    validate(verifier, diffs);
  } finally {
    console.log = origLog;
  }
  return results;
}

describe("validate", () => {
  it("matches exact insert", () => {
    const verifier: VerifierSpec = {
      type: "state_mutation_match",
      mutations: [
        {
          action: "INSERT",
          tablename: "foo",
          values: { id: 1, name: "bar" },
        },
      ],
    };
    const diffs: DiffResult[] = [
      { table: "foo", method: "insert", record: { id: 1, name: "bar" } },
    ];
    const results = validate(verifier, diffs);
    expect(results[0].success).toBe(true);
    expect(results[0].type).toBe("INSERT");
    expect(results[0].expected).toEqual(verifier.mutations[0]);
    expect(results[0].actual).toEqual(diffs[0]);
  });

  it("fails on missing mutation", () => {
    const verifier: VerifierSpec = {
      type: "state_mutation_match",
      mutations: [
        {
          action: "INSERT",
          tablename: "foo",
          values: { id: 1, name: "bar" },
        },
      ],
    };
    const diffs: DiffResult[] = [];
    const results = validate(verifier, diffs);
    expect(results[0].success).toBe(false);
    expect(results[0].actual).toBe(null);
    expect(results[0].expected).toEqual(verifier.mutations[0]);
    expect(results[0].type).toBe("INSERT");
  });

  it("matches regex", () => {
    const verifier: VerifierSpec = {
      type: "state_mutation_match",
      mutations: [
        {
          action: "INSERT",
          tablename: "foo",
          values: { name: { type: "regex", regex: ".*bar.*" } },
        },
      ],
    };
    const diffs: DiffResult[] = [
      { table: "foo", method: "insert", record: { name: "hello bar world" } },
    ];
    const results = validate(verifier, diffs);
    expect(results[0].success).toBe(true);
    expect(results[0].actual).toEqual(diffs[0]);
    expect(results[0].expected).toEqual(verifier.mutations[0]);
    expect(results[0].type).toBe("INSERT");
  });

  it("matches mutation_variable", () => {
    const verifier: VerifierSpec = {
      type: "state_mutation_match",
      mutations: [
        {
          action: "INSERT",
          tablename: "foo",
          values: {
            id: { type: "mutation_variable", name: "id" },
            name: "bar",
          },
        },
      ],
    };
    const diffs: DiffResult[] = [
      { table: "foo", method: "insert", record: { id: 123, name: "bar" } },
    ];
    const results = validate(verifier, diffs);
    expect(results[0].success).toBe(true);
    expect(results[0].actual).toEqual(diffs[0]);
    expect(results[0].expected).toEqual(verifier.mutations[0]);
    expect(results[0].type).toBe("INSERT");
  });

  it("matches semantic_match_variable (placeholder)", () => {
    const verifier: VerifierSpec = {
      type: "state_mutation_match",
      mutations: [
        {
          action: "INSERT",
          tablename: "foo",
          values: {
            name: {
              type: "semantic_match_variable",
              description: "should be bar",
            },
          },
        },
      ],
    };
    const diffs: DiffResult[] = [
      { table: "foo", method: "insert", record: { name: "bar" } },
    ];
    const results = validate(verifier, diffs);
    expect(results[0].success).toBe(true);
    expect(results[0].actual).toEqual(diffs[0]);
    expect(results[0].expected).toEqual(verifier.mutations[0]);
    expect(results[0].type).toBe("INSERT");
  });

  it("matches update with where", () => {
    const verifier: VerifierSpec = {
      type: "state_mutation_match",
      mutations: [
        {
          action: "UPDATE",
          tablename: "foo",
          where: { id: 1 },
          values: { name: "baz" },
        },
      ],
    };
    const diffs: DiffResult[] = [
      {
        table: "foo",
        method: "update",
        where: { id: 1 },
        record: { name: "baz" },
      },
    ];
    const results = validate(verifier, diffs);
    expect(results[0].success).toBe(true);
    expect(results[0].actual).toEqual(diffs[0]);
    expect(results[0].expected).toEqual(verifier.mutations[0]);
    expect(results[0].type).toBe("UPDATE");
  });
});
