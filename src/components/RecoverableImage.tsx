import { createImageRecovery } from "@/lib/image-recovery";
import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { isCurrentPrivateScope, privateScope } from "@/lib/private-cache";
import { useAuth } from "@/lib/auth-context";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  refreshUrl?: () => Promise<string | null | undefined>;
};

/** A single read-only refresh per source. Never retries generation or loops on a bad URL. */
export function RecoverableImage({ src, alt, refreshUrl, ...props }: Props) {
  const { user } = useAuth();
  const [replacement, setReplacement] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const recovery = useRef(createImageRecovery());
  const revision = useRef(0);
  useEffect(() => {
    const sourceRevision = ++revision.current;
    recovery.current = createImageRecovery();
    setReplacement(null);
    setFailed(false);
    setRefreshing(false);
    return () => {
      revision.current = sourceRevision + 1;
    };
  }, [src, user?.id]);
  async function recover() {
    setFailed(true);
    if (!refreshUrl) return;
    const current = revision.current;
    const scope = user ? privateScope(user.id) : null;
    setRefreshing(true);
    try {
      const next = await recovery.current(refreshUrl);
      if (current !== revision.current || (scope && !isCurrentPrivateScope(scope))) return;
      if (next) {
        setReplacement(next);
        setFailed(false);
      }
    } catch {
      /* The fallback stays visible; no provider or mutation retry. */
    } finally {
      if (current === revision.current) setRefreshing(false);
    }
  }
  if (failed || !src)
    return (
      <span
        role="img"
        aria-label={`${alt || "Image"}: unavailable`}
        className={`inline-flex min-h-16 items-center justify-center bg-[color:var(--bg-subtle)] p-3 text-center text-xs text-[color:var(--text-secondary)] ${props.className ?? ""}`}
      >
        {refreshing ? "Refreshing image…" : "Image unavailable. Reopen this view to try again."}
      </span>
    );
  return <img {...props} src={replacement ?? src} alt={alt} onError={() => void recover()} />;
}
