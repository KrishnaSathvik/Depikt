// Minimal Server-Sent Events helpers, shared by the OpenAI stream reader
// (parsing upstream events) and the public route (encoding Depikt events).

export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Incremental SSE parser. Feed raw chunks; get complete messages back.
 * Handles multi-line `data:` fields and blank-line message boundaries.
 */
export class SseParser {
  private buffer = "";
  private event = "";
  private data: string[] = [];

  /** Push a chunk and return every complete message it finished. */
  push(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const out: SseMessage[] = [];
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) !== -1) {
      let line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);

      if (line === "") {
        if (this.data.length > 0 || this.event) {
          out.push({ event: this.event || "message", data: this.data.join("\n") });
        }
        this.event = "";
        this.data = [];
        continue;
      }
      if (line.startsWith(":")) continue; // comment / keepalive
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "event") this.event = value;
      else if (field === "data") this.data.push(value);
      // id/retry ignored
    }
    return out;
  }

  /** Flush a trailing message with no terminating blank line. */
  end(): SseMessage[] {
    const out: SseMessage[] = [];
    if (this.buffer.length > 0) out.push(...this.push("\n"));
    if (this.data.length > 0 || this.event) {
      out.push({ event: this.event || "message", data: this.data.join("\n") });
      this.event = "";
      this.data = [];
    }
    return out;
  }
}

/** Encode one Depikt SSE frame (`event:` + JSON `data:`). */
export function encodeSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
