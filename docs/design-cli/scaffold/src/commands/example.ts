import { defineCommand } from "citty";
import list from "./example-list";
import create from "./example-create";

export default defineCommand({
  meta: { name: "example", description: "Examples (read + mutate)" },
  subCommands: { list, create },
});
