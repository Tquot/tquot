/** Replace `{key}` placeholders in a translation string. */
export function formatTemplate(
  str: string,
  vars: Record<string, string | number>,
): string {
  return str.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? `{${key}}` : String(value);
  });
}
