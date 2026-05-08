import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "version", description: "Print version (parseable: <name> <semver> [<sha>])", readOnly: true },
  run() {
    const sha = process.env.GIT_SHA ?? "unknown";
    process.stdout.write(`demo-cli 0.1.0 (${sha})\n`);
  },
});
