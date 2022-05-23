import { Preferences, Role, User, Users } from "../data";
import type { Message } from "./message";
import type { Store } from "./store";

export type CommandNode = {
  description?: string;
  _?: CommandNonRoot;
};
export type CommandLeaf = {
  allows: Role | ((user: User) => boolean);
  handle: (user: User, ...args: string[]) => void;
  description?: string;
  _?: CommandNonRoot;
};
export type Command = CommandNode | CommandLeaf;
export type CommandNonRoot = Record<string, Command>;

export const Default = Symbol("default");
export type CommandMap = Record<string, Command> & { [Default]: Command };

export const define = <T extends CommandMap>(c: T): T => c;

export const visit = (
  root: CommandNonRoot,
  visitor: (chain: string[], v: Command) => void,
  chain: string[] = [],
) => {
  for (const key of Object.keys(root)) {
    const _chain = [...chain, key];
    const child = root[key];
    visitor(_chain, child);
    if (child._) visit(child._, visitor, _chain);
  }
};

/**
 * Resolve a command descriptor from a set of arguments while consuming any arguments
 * which are part of the command tree.
 *
 * Example:
 * ```ts
 * // [{}, ["b", "c"]]
 * console.log(
 *   resolve(
 *     { a: {} },
 *     ["a", "b", "c"]
 *   )
 * )
 *
 * // [{}, []]
 * console.log(
 *   resolve(
 *     { a: { _: { b: { _: c: {} } } } },
 *     ["a", "b", "c"]
 *   )
 * )
 * ```
 */
export function resolve(
  commands: CommandMap,
  args: readonly string[],
): [Command | null, string[]] {
  if (args.length === 0) return [null, []];
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
  return [root, [...args.slice(consumed)]];
}

const RE = /:(.*)!.*PRIVMSG.*:(.*)[\r\n]*/;

export function handle(
  users: Store<Users>,
  prefs: Store<Preferences>,
  prefix: Store<string>,
  commands: CommandMap,
  message: Message,
) {
  const [username, msg] = [message.prefix?.nick, message.params.at(-1)];
  if (!username || !msg) return;

  const isPrefixed = msg.startsWith(prefix.get());
  // we don't want to allow prefix-less messages when autoplay mode is not enabled
  if (!prefs.get().autoplay && !isPrefixed) return;
  // if message starts with prefix, it is the first argument, so skip it
  const rawArgs = isPrefixed
    ? msg.slice(prefix.get().length).split(" ")
    : msg.split(" ");
  let [cmd, resolvedArgs] = resolve(commands, rawArgs);
  console.log(cmd, resolvedArgs);
  if (!cmd) cmd = commands[Default];
  // also, resolved command must be a handler
  if (!("handle" in cmd)) return;
  const { allows, handle } = cmd;
  // initialize user if they don't exist
  if (!(username in users.get())) {
    users.update((users) => ({
      ...users,
      [username]: { name: username, role: Role.None },
    }));
  }
  const user = users.get()[username];
  // user must be allowed to execute command
  if (typeof allows === "function") {
    if (!allows(user)) return;
  } else if (user.role < allows) return;
  // message must contain enough arguments
  const arity = handle.length - 1;
  if (arity > resolvedArgs.length) return;
  // take arguments, and join the last argument with any past arity
  const args = [...resolvedArgs.splice(0, arity - 1), resolvedArgs.join(" ")];
  handle(user, ...args);
}
