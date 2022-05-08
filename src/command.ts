export type CommandNode = {
  description?: () => string;
  _?: CommandMap;
};
export type CommandLeaf = {
  allows: (user: string) => boolean;
  handle: (user: string, ...args: string[]) => void;
  description?: () => string;
  _?: CommandMap;
};
export type Command = CommandNode | CommandLeaf;
export type CommandMap = Record<string, Command>;

export const define = <T extends CommandMap>(c: T): T => c;

export const visit = (root: CommandMap, visitor: (chain: string[], v: Command) => void, chain: string[] = []) => {
  for (const key of Object.keys(root)) {
    const _chain = [...chain, key];
    const child = root[key];
    visitor(_chain, child);
    if (child._) visit(child._, visitor, _chain);
  }
};

export /**
 * Resolve a command descriptor from a set of arguments
 */
function resolve(commands: CommandMap, args: readonly string[]): [Command | null, string[]] {
  if (args.length === 0) return [null, [...args]];
  let root = commands[args[0]];
  if (!root) return [null, [...args]];

  let consumed = 1;
  let len = args.length;
  while (consumed < len) {
    const name = args[consumed];
    if (!root._) break;
    if (!(name in root._)) break;
    else {
      consumed += 1;
      root = root._[name];
    }
  }
  return [root, [...args.slice(consumed - 1)]];
}

const RE = /:(.*)!.*PRIVMSG.*:(.*)[\r\n]*/;

export function handle(prefs: Record<string, boolean>, commands: CommandMap, prefix: string, message: string) {
  const matches = RE.exec(message);
  if (!matches) return;

  const [user, msg] = matches.slice(1);
  if (!user || !msg) return;

  // we don't want to allow prefix-less messages when autoplay mode is not enabled
  if (!prefs.autoplay && !msg.startsWith(prefix)) return;
  // if message starts with prefix, it is the first argument, so skip it
  const rawArgs = msg.startsWith(prefix) ? msg.split(" ").slice(1) : msg.split(" ");
  let [cmd, resolvedArgs] = resolve(commands, rawArgs);
  if (!cmd) cmd = commands.$play;
  // resolved command must be a handler
  if (!("handle" in cmd)) return;
  // user must be allowed to execute command
  if (!cmd.allows(user)) return;
  // message must contain enough arguments
  const arity = cmd.handle.length - 1;
  if (arity > resolvedArgs.length) return;
  // take arguments, and join the last argument with any past arity
  const args = [...resolvedArgs.splice(0, arity - 1), resolvedArgs.join(" ")];
  cmd.handle(user, ...args);
}
