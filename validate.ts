import fs from "fs";

// Types for verifier spec
interface RegexVerifier {
  type: "regex";
  regex: string;
}
interface MutationVariableVerifier {
  type: "mutation_variable";
  name: string;
}
interface SemanticMatchVariableVerifier {
  type: "semantic_match_variable";
  description: string;
}
type ValueVerifier =
  | RegexVerifier
  | MutationVariableVerifier
  | SemanticMatchVariableVerifier
  | string
  | number
  | boolean
  | null;

interface MutationVerifier {
  action: "INSERT" | "UPDATE" | "DELETE";
  tablename: string;
  values?: Record<string, ValueVerifier>;
  where?: Record<string, ValueVerifier>;
}

interface StateMutationMatchVerifier {
  type: "state_mutation_match";
  mutations: MutationVerifier[];
}

type VerifierSpec = StateMutationMatchVerifier;

type DiffInsert = {
  table: string;
  method: "insert";
  record: Record<string, any>;
};
type DiffUpdate = {
  table: string;
  method: "update";
  where: Record<string, any>;
  record: Record<string, any>;
};
type DiffDelete = {
  table: string;
  method: "delete";
  where: Record<string, any>;
};
type DiffResult = DiffInsert | DiffUpdate | DiffDelete;

function matchRegex(value: any, regex: string): boolean {
  if (typeof value !== "string") return false;
  return new RegExp(regex).test(value);
}

function matchMutationVariable(_value: any, _name: string): boolean {
  // Always true, just a placeholder for variable capture
  return true;
}

function matchSemantic(_value: any, _desc: string): boolean {
  // Placeholder: always true, real implementation would use LLM/embedding
  return true;
}

function matchValue(verifier: ValueVerifier, value: any): boolean {
  if (verifier && typeof verifier === "object" && "type" in verifier) {
    switch (verifier.type) {
      case "regex":
        return matchRegex(value, verifier.regex);
      case "mutation_variable":
        return matchMutationVariable(value, verifier.name);
      case "semantic_match_variable":
        return matchSemantic(value, verifier.description);
      default:
        return false;
    }
  } else {
    // Literal match
    return verifier === value;
  }
}

function matchMutation(verifier: MutationVerifier, diff: DiffResult): boolean {
  if (
    verifier.action === "INSERT" &&
    diff.method === "insert" &&
    verifier.tablename === diff.table
  ) {
    if (!verifier.values) return true;
    for (const [k, v] of Object.entries(verifier.values)) {
      if (!matchValue(v, diff.record[k])) return false;
    }
    return true;
  }
  if (
    verifier.action === "UPDATE" &&
    diff.method === "update" &&
    verifier.tablename === diff.table
  ) {
    if (!verifier.values) return true;
    for (const [k, v] of Object.entries(verifier.values)) {
      if (!matchValue(v, diff.record[k])) return false;
    }
    if (verifier.where) {
      for (const [k, v] of Object.entries(verifier.where)) {
        if (!matchValue(v, diff.where[k])) return false;
      }
    }
    return true;
  }
  if (
    verifier.action === "DELETE" &&
    diff.method === "delete" &&
    verifier.tablename === diff.table
  ) {
    if (!verifier.where) return true;
    for (const [k, v] of Object.entries(verifier.where)) {
      if (!matchValue(v, diff.where[k])) return false;
    }
    return true;
  }
  return false;
}

export interface ValidationResult {
  success: boolean;
  actual: DiffResult | null;
  expected: MutationVerifier;
  type: string;
}

function validate(
  verifier: VerifierSpec,
  diffs: DiffResult[]
): ValidationResult[] {
  if (verifier.type !== "state_mutation_match") {
    throw new Error("Unsupported verifier type");
  }
  const results: ValidationResult[] = [];
  for (const mutation of verifier.mutations) {
    const found = diffs.find((diff) => matchMutation(mutation, diff));
    results.push({
      success: Boolean(found),
      actual: found || null,
      expected: mutation,
      type: mutation.action,
    });
  }
  return results;
}

function main() {
  const [verifierPath, diffPath] = process.argv.slice(2);
  if (!verifierPath || !diffPath) {
    console.error("Usage: bun validate.ts <verifier.json> <diff.json>");
    process.exit(1);
  }
  const verifier: VerifierSpec = JSON.parse(
    fs.readFileSync(verifierPath, "utf-8")
  );
  const diffs: DiffResult[] = JSON.parse(fs.readFileSync(diffPath, "utf-8"));
  const results = validate(verifier, diffs);
  for (const r of results) {
    if (r.success) {
      console.log(`✔ Matched mutation: ${r.type} on ${r.expected.tablename}`);
    } else {
      console.log(
        `✘ No match for mutation: ${r.type} on ${r.expected.tablename}`
      );
    }
  }
}

export { validate };
export type { DiffResult, VerifierSpec, ValidationResult };

if (require.main === module || (import.meta && import.meta.main)) {
  main();
}
