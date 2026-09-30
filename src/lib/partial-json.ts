// Tolerant partial JSON parsing for streaming tool-call arguments.
// Extracts string values for known keys even when the JSON is incomplete.

function unescapeJsonString(raw: string): string {
  // raw is the contents between quotes, possibly ending mid-escape.
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\") {
      const next = raw[i + 1];
      if (next === undefined) break; // dangling escape
      switch (next) {
        case '"':
          out += '"';
          break;
        case "\\":
          out += "\\";
          break;
        case "/":
          out += "/";
          break;
        case "n":
          out += "\n";
          break;
        case "t":
          out += "\t";
          break;
        case "r":
          out += "\r";
          break;
        case "b":
          out += "\b";
          break;
        case "f":
          out += "\f";
          break;
        case "u": {
          const hex = raw.slice(i + 2, i + 6);
          if (hex.length < 4) {
            i = raw.length;
            break;
          }
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
          break;
        }
        default:
          out += next;
      }
      i += 1;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Find the value of a top-level string key in a (possibly incomplete) JSON
 * object string. Returns the (partially) decoded string, or null if not found.
 */
export function extractPartialString(src: string, key: string): string | null {
  const needle = `"${key}"`;
  const keyIdx = src.indexOf(needle);
  if (keyIdx === -1) return null;
  // Find the colon
  let i = keyIdx + needle.length;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== ":") return null;
  i++;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== '"') return null;
  i++;
  // Now scan until unescaped closing quote OR end of buffer.
  let end = i;
  while (end < src.length) {
    const ch = src[end];
    if (ch === "\\") {
      end += 2;
      continue;
    }
    if (ch === '"') break;
    end++;
  }
  return unescapeJsonString(src.slice(i, end));
}

/**
 * Find all elements (so far) of a top-level string array key.
 * Returns an array of (partially) decoded strings — last one may be incomplete.
 */
export function extractPartialStringArray(src: string, key: string): string[] | null {
  const needle = `"${key}"`;
  const keyIdx = src.indexOf(needle);
  if (keyIdx === -1) return null;
  let i = keyIdx + needle.length;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== ":") return null;
  i++;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== "[") return null;
  i++;
  const out: string[] = [];
  while (i < src.length) {
    while (i < src.length && /[\s,]/.test(src[i])) i++;
    if (src[i] === "]") break;
    if (src[i] !== '"') break; // unexpected
    i++;
    let end = i;
    while (end < src.length) {
      const ch = src[end];
      if (ch === "\\") {
        end += 2;
        continue;
      }
      if (ch === '"') break;
      end++;
    }
    out.push(unescapeJsonString(src.slice(i, end)));
    if (end >= src.length) break; // incomplete trailing string
    i = end + 1;
  }
  return out;
}
