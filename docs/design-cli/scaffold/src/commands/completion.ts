import { defineCommand, type CommandDef } from "citty";
import { ExitCode } from "../errors";

let getRoot: (() => CommandDef) | null = null;

export function setRoot(fn: () => CommandDef): void {
  getRoot = fn;
}

async function resolveTopLevelCommands(): Promise<string[]> {
  const fn = getRoot;
  if (!fn) return [];
  const raw = fn().subCommands;
  const resolved =
    typeof raw === "function"
      ? await Promise.resolve((raw as () => unknown)())
      : await Promise.resolve(raw);
  if (!resolved || typeof resolved !== "object") return [];
  return Object.keys(resolved as Record<string, unknown>);
}

const bash = (cli: string, cmds: string[]) => `_${cli.replace(/[^a-zA-Z0-9]/g, "_")}_complete() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local cmds="${[...cmds, "--help"].join(" ")}"
  COMPREPLY=( $(compgen -W "$cmds" -- "$cur") )
}
complete -F _${cli.replace(/[^a-zA-Z0-9]/g, "_")}_complete ${cli}
`;

const zsh = (cli: string, cmds: string[]) => `#compdef ${cli}
_${cli.replace(/[^a-zA-Z0-9]/g, "_")}() {
  local -a cmds
  cmds=(${cmds.map(c => `'${c}'`).join(" ")})
  _describe 'command' cmds
}
_${cli.replace(/[^a-zA-Z0-9]/g, "_")} "$@"
`;

const fish = (cli: string, cmds: string[]) =>
  `complete -c ${cli} -f -n "__fish_use_subcommand" -a "${cmds.join(" ")}"\n`;

export default defineCommand({
  meta: { name: "completion", description: "Output a shell completion script (bash|zsh|fish)", readOnly: true },
  args: {
    shell: { type: "positional", required: true, valueHint: "bash|zsh|fish" },
  },
  async run({ args }) {
    const cli = "demo-cli";
    const cmds = await resolveTopLevelCommands();
    const script =
      args.shell === "bash" ? bash(cli, cmds)
      : args.shell === "zsh"  ? zsh(cli, cmds)
      : args.shell === "fish" ? fish(cli, cmds)
      : null;
    if (!script) {
      process.stderr.write(`unknown shell: ${args.shell} (use bash|zsh|fish)\n`);
      process.exit(ExitCode.Usage);
    }
    process.stdout.write(script);
  },
});
