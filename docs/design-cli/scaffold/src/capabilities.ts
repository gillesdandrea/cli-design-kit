export type CapabilityEntry = {
  capability: string;
  command: string;
  tokens: string[];
};

export const capabilities: CapabilityEntry[] = [
  { capability: "list examples",     command: "example list",   tokens: ["list", "example", "examples"] },
  { capability: "create an example", command: "example create", tokens: ["create", "new", "make", "example"] },
  { capability: "diagnose",          command: "doctor",         tokens: ["doctor", "diag", "diagnose", "health"] },
  { capability: "sync local store",  command: "sync",           tokens: ["sync", "pull", "fetch", "refresh"] },
];
