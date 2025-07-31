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
  return_value?: ValueVerifier;
  final_url?: ValueVerifier;
  agent_error?: ValueVerifier;
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

interface ResultsData {
  state: {
    mutations: DiffResult[];
  };
  return_value?: any;
  final_url?: any;
  agent_error?: any;
}

interface VerifierResult {
  success: boolean;
  actual: DiffResult | any | null;
  expected: MutationVerifier | any;
  type: string;
}

interface ValidationResult {
  verifiers: VerifierResult[];
  result: boolean;
  totalVerifiers: number;
  passedVerifiers: number;
}

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

function validate(
  verifier: VerifierSpec,
  results: ResultsData
): ValidationResult {
  if (verifier.type !== "state_mutation_match") {
    throw new Error("Unsupported verifier type");
  }

  const verifierResults: VerifierResult[] = [];

  // Check mutations
  for (const mutation of verifier.mutations) {
    const found = results.state.mutations.find((diff) =>
      matchMutation(mutation, diff)
    );
    verifierResults.push({
      success: Boolean(found),
      actual: found || null,
      expected: mutation,
      type: "mutation",
    });
  }

  // Check return_value
  if (verifier.return_value !== undefined) {
    verifierResults.push({
      success: matchValue(verifier.return_value, results.return_value),
      actual: results.return_value,
      expected: verifier.return_value,
      type: "return_value",
    });
  }

  // Check final_url
  if (verifier.final_url !== undefined) {
    verifierResults.push({
      success: matchValue(verifier.final_url, results.final_url),
      actual: results.final_url,
      expected: verifier.final_url,
      type: "final_url",
    });
  }

  // Check agent_error
  if (verifier.agent_error !== undefined) {
    verifierResults.push({
      success: matchValue(verifier.agent_error, results.agent_error),
      actual: results.agent_error,
      expected: verifier.agent_error,
      type: "agent_error",
    });
  }

  const passedVerifiers = verifierResults.filter((r) => r.success).length;

  return {
    verifiers: verifierResults,
    result: verifierResults.every((r) => r.success),
    totalVerifiers: verifierResults.length,
    passedVerifiers,
  };
}

function main() {
  const [verifierPath, resultsPath] = process.argv.slice(2);
  if (!verifierPath || !resultsPath) {
    console.error("Usage: bun validate.ts <verifier.json> <results.json>");
    process.exit(1);
  }
  const verifier: VerifierSpec = JSON.parse(
    fs.readFileSync(verifierPath, "utf-8")
  );
  const results: ResultsData = JSON.parse(
    fs.readFileSync(resultsPath, "utf-8")
  );

  const validationResults = validate(verifier, results);

  for (const r of validationResults.verifiers) {
    if (r.success) {
      console.log(`✔ Matched ${r.type}: ${r.expected.tablename || r.expected}`);
    } else {
      console.log(
        `✘ No match for ${r.type}: ${r.expected.tablename || r.expected}`
      );
    }
  }
}

export { validate };
export type {
  DiffResult,
  VerifierSpec,
  ValidationResult,
  ResultsData,
  VerifierResult,
};

if (require.main === module || (import.meta && import.meta.main)) {
  main();
}
