import { defineCommand } from "citty";
import { ExitCode } from "../errors";

const COMMANDS = "example today which agent-context completion doctor profile sync version feedback --help";

const bash = (cli: string) => `_${cli.replace(/[^a-zA-Z0-9]/g, "_")}_complete() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local cmds="${COMMANDS}"
  COMPREPLY=( $(compgen -W "$cmds" -- "$cur") )
}
complete -F _${cli.replace(/[^a-zA-Z0-9]/g, "_")}_complete ${cli}
`;

const zsh = (cli: string) => `#compdef ${cli}
_${cli.replace(/[^a-zA-Z0-9]/g, "_")}() {
  local -a cmds
  cmds=(${COMMANDS.split(" ").filter(c => !c.startsWith("--")).map(c => `'${c}'`).join(" ")})
  _describe 'command' cmds
}
_${cli.replace(/[^a-zA-Z0-9]/g, "_")} "$@"
`;

const fish = (cli: string) =>
  `complete -c ${cli} -f -n "__fish_use_subcommand" -a "${COMMANDS.replace(/--\S+/g, "").trim()}"\n`;

export default defineCommand({
  meta: { name: "completion", description: "Output a shell completion script (bash|zsh|fish)" },
  args: {
    shell: { type: "positional", required: true, valueHint: "bash|zsh|fish" },
  },
  run({ args }) {
    const cli = "demo-cli";
    const script =
      args.shell === "bash" ? bash(cli)
      : args.shell === "zsh"  ? zsh(cli)
      : args.shell === "fish" ? fish(cli)
      : null;
    if (!script) {
      process.stderr.write(`unknown shell: ${args.shell} (use bash|zsh|fish)\n`);
      process.exit(ExitCode.Usage);
    }
    process.stdout.write(script);
  },
});
