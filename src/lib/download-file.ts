/**
 * Forces a real browser download instead of a same-tab/new-tab navigation.
 *
 * A plain `<a download href="https://other-origin/...">.click()` only
 * honors the `download` attribute for a same-origin `href`; for a
 * cross-origin URL (a Supabase Storage URL, a different host from the
 * app) browsers ignore `download` entirely and just navigate there. On
 * top of that, `target="_blank"` (a reflexive `noopener` habit) turns
 * that navigation into a new tab -- which is exactly what "it opened in
 * another tab instead of downloading" describes.
 *
 * Fetching the bytes and downloading from a same-origin `blob:` URL is
 * the one approach every browser honors reliably, since `download` then
 * always applies (same-origin, no `target` set). Falls back to opening
 * the URL directly (previous behavior) only if the fetch itself fails --
 * e.g. a CORS-restricted host -- so this never regresses below what
 * downloading already did.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
