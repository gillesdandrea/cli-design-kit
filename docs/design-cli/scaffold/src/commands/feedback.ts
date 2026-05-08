import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "feedback", description: "Open a prefilled GitHub issue URL" },
  run() {
    const body = encodeURIComponent(
      `Version: 0.1.0\nNode/Bun: ${process.versions.bun ?? process.version}\nOS: ${process.platform}\n\n---\n\n`
    );
    process.stdout.write(`https://github.com/your-org/demo-cli/issues/new?body=${body}\n`);
  },
});
