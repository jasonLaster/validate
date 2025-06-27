import { $ } from "bun";
import fs from "fs";

// This script is intended for Bun runtime only.

// Type for diff result items
interface DiffInsert {
  table: string;
  method: "insert";
  record: Record<string, any>;
}
interface DiffUpdate {
  table: string;
  method: "update";
  where: Record<string, any>;
  record: Record<string, any>;
}
interface DiffDelete {
  table: string;
  method: "delete";
  where: Record<string, any>;
}
type DiffResult = DiffInsert | DiffUpdate | DiffDelete;

function splitStatements(input: string): string[] {
  return input.split(/;\s*/).filter(Boolean);
}

function parseSQL(line: string): DiffResult | null {
  const trimmed = line.trim();
  if (trimmed.startsWith("INSERT INTO")) {
    const match = trimmed.match(
      /INSERT INTO (\w+)\(([^)]+)\) VALUES\(([^)]+)\)/
    );
    if (!match) return null;
    const [, table, columns, values] = match;
    const keys = columns.split(",").map((k) => k.trim());
    const vals = parseValues(values);
    return {
      table,
      method: "insert",
      record: Object.fromEntries(keys.map((k, i) => [k, vals[i]])),
    };
  } else if (trimmed.startsWith("UPDATE")) {
    const match = trimmed.match(/UPDATE (\w+) SET (.+) WHERE (.+)/);
    if (!match) return null;
    const [, table, setClause, whereClause] = match;
    const record = Object.fromEntries(
      setClause.split(",").map((kv) => {
        const [k, v] = kv.split("=");
        return [k.trim(), parseSingleValue(v.trim())];
      })
    );
    const where = Object.fromEntries(
      whereClause.split("AND").map((kv) => {
        const [k, v] = kv.split("=");
        return [k.trim(), parseSingleValue(v.trim())];
      })
    );
    return {
      table,
      method: "update",
      where,
      record,
    };
  } else if (trimmed.startsWith("DELETE FROM")) {
    const match = trimmed.match(/DELETE FROM (\w+) WHERE (.+)/);
    if (!match) return null;
    const [, table, whereClause] = match;
    const where = Object.fromEntries(
      whereClause.split("AND").map((kv) => {
        const [k, v] = kv.split("=");
        return [k.trim(), parseSingleValue(v.trim())];
      })
    );
    return {
      table,
      method: "delete",
      where,
    };
  }
  return null;
}

function parseValues(valStr: string) {
  const regex = /'[^']*'|NULL|[^,]+/g;
  return [...valStr.matchAll(regex)].map((v) => parseSingleValue(v[0]));
}

function parseSingleValue(v: string) {
  if (v === "NULL") return null;
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  if (!isNaN(Number(v))) return Number(v);
  return v;
}

async function main() {
  const [before, after] = Bun.argv.slice(2);
  if (!before || !after) {
    console.error("Usage: bun diff.ts <before.db> <after.db>");
    Bun.exit(1);
  }

  // Run sqldiff and capture output as string
  const input = (await $`sqldiff ${before} ${after}`.text()).trim();
  const lines = splitStatements(input);
  const result = lines.map(parseSQL).filter(Boolean);

  console.log(JSON.stringify(result, null, 2));
}

main();
