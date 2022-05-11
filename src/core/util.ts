export const unique = <T>(a: T[]) => [...new Set(a)];
export const capitalize = (v: string) => v.substring(0, 1).toUpperCase() + v.substring(1);
