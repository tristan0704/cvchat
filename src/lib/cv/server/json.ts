import "server-only";

export function parseJsonObject<T>(value: string): T {
  const trimmed = value.trim();

  if (trimmed.startsWith("```")) {
    const withoutFenceStart = trimmed.replace(/^```(?:json)?\s*/i, "");
    const withoutFenceEnd = withoutFenceStart.replace(/\s*```$/, "");
    return JSON.parse(withoutFenceEnd) as T;
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return JSON.parse(trimmed.slice(objectStart, objectEnd + 1)) as T;
  }

  return JSON.parse(trimmed) as T;
}
