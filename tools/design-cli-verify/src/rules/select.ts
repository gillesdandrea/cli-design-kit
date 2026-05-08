import type { Rule } from "../types";
import { run, tokenize } from "../run";

const rule: Rule = async (target, config) => {
  const r = await run(target, {
    args: [...tokenize(config.sampleReadCommand), "--json", "--select", config.knownField],
  });
  if (r.exitCode !== 0) return { rule: "select", severity: "fail", detail: `--select exited ${r.exitCode}` };
  let payload: unknown;
  try { payload = JSON.parse(r.stdout.trim()); }
  catch { return { rule: "select", severity: "fail", detail: "stdout not JSON" }; }
  const records = Array.isArray(payload) ? payload : [payload];
  if (records.length === 0) return { rule: "select", severity: "warn", detail: "no records to inspect" };
  for (const rec of records) {
    if (!rec || typeof rec !== "object") continue;
    const keys = Object.keys(rec as object);
    if (!keys.includes(config.knownField)) {
      return { rule: "select", severity: "fail", detail: `record missing "${config.knownField}": ${JSON.stringify(rec).slice(0, 80)}` };
    }
    const extra = keys.filter(k => k !== config.knownField);
    if (extra.length > 0) {
      return { rule: "select", severity: "fail", detail: `--select returned extra fields: ${extra.join(",")}` };
    }
  }
  return { rule: "select", severity: "pass", detail: `--select ${config.knownField} returns only that field` };
};

export default rule;
