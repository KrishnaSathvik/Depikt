export interface SSEHandlers<T> {
  onStatus?: (data: Record<string, unknown>) => void;
  onDelta?: (data: Record<string, unknown>) => void;
  onDone?: (data: T) => void;
  onError?: (data: Record<string, unknown>) => void;
}

export async function readSSEStream<T>(
  res: Response,
  handlers: SSEHandlers<T> = {},
): Promise<T | null> {
  if (!res.body) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  let final: T | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);

        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
          continue;
        }

        if (line.startsWith("data:")) {
          const payload = line.slice(5).trim();
          if (!payload) continue;

          try {
            const json = JSON.parse(payload);
            if (currentEvent === "status") {
              handlers.onStatus?.(json);
            } else if (currentEvent === "delta") {
              handlers.onDelta?.(json);
            } else if (currentEvent === "done") {
              final = json as T;
              handlers.onDone?.(final);
            } else if (currentEvent === "error") {
              handlers.onError?.(json);
            }
          } catch {
            /* ignore malformed keepalives */
          }
          continue;
        }

        if (line === "") {
          currentEvent = "";
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }

  return final;
}
