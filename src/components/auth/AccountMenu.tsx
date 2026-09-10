import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { useAccountSummary } from "@/lib/billing/use-account-summary";
import { AUTH_COPY, ROUTES } from "@/lib/product";

function initialFor(user: User): string {
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "?";
  return name.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Signed-in header control: a 28px initial disc opening a compact menu.
 * Billing actions only appear when they can actually work (a Stripe
 * customer exists). No credits pill lives in the header itself.
 */
export function AccountMenu({ user, onBuyCredits }: { user: User; onBuyCredits?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const summary = useAccountSummary(user);

  async function openPortal() {
    const { openBillingPortal } = await import("@/lib/billing/client");
    await openBillingPortal();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg)] text-[12px] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
      >
        {initialFor(user)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-[12px] text-[color:var(--text-secondary)]">{user.email}</p>
          <p className="mt-0.5 text-[13px] font-medium text-[color:var(--text-primary)]">
            {summary.credits === null ? "—" : `${summary.credits} credits`}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: ROUTES.account })}>
          Account
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (onBuyCredits) onBuyCredits();
            else void navigate({ to: ROUTES.account, search: { buy: "1" } });
          }}
        >
          Buy credits
        </DropdownMenuItem>
        {summary.hasStripeCustomer && (
          <DropdownMenuItem onSelect={() => void openPortal()}>Manage billing</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>{AUTH_COPY.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
