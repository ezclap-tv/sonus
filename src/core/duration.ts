const Millisecond = 1;
const Second = Millisecond * 1000;
const Minute = Second * 60;
const Hour = Minute * 60;
const Day = Hour * 24;

const alias = (value: number, names: string[]) =>
  Object.fromEntries(names.map((name) => [name, value]));

const units = {
  ...alias(Millisecond, [
    "ms",
    "msec",
    "msecs",
    "milli",
    "millis",
    "millisecond",
    "milliseconds",
  ]),
  ...alias(Second, ["s", "sec", "secs", "seconds"]),
  ...alias(Minute, ["m", "min", "min", "minutes"]),
  ...alias(Hour, ["h", "hr", "hrs", "hour", "hours"]),
  ...alias(Day, ["d", "day", "days"]),
};

const PAIR_REGEX = /(\d+)\s*(\w+)/;

/**
 * Parses a free-form human-readable duration string,
 * and returns its value in milliseconds.
 *
 * Available units:
 * - milliseconds
 * - seconds
 * - minutes
 * - hours
 * - days
 *
 * Examples:
 * ```ts
 * console.log(parseDuration("5m 10s")) // 5 * 60 * 1000 + 10 * 1000 = 260000ms
 * console.log(parseDuration("10h 2s")) // 10 * 60 * 60 * 1000 + 2 * 1000 = 36002000ms
 * console.log(parseDuration("5millis")) // 5
 * console.log(parseDuration("5ms")) // 5
 * console.log(parseDuration("5 milliseconds")) // 5
 * console.log(parseDuration("100")) // 100000
 * ```
 */
export function parseDuration(s: string): number {
  // if the whole string is a number, treat is as a value in seconds
  if (!Number.isNaN(Number(s))) {
    return Number(s) * Millisecond;
  }

  let result = 0;
  let rem = s;
  let match = rem.match(PAIR_REGEX);
  while (rem.length > 0 && match) {
    const [full, value, unit] = match;
    rem = rem.slice(full.length);

    if (!(unit in units)) continue;
    result += Number(value) * units[unit];

    match = rem.match(PAIR_REGEX);
  }
  return result;
}
