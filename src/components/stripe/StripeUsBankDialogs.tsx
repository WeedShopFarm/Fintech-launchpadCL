import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

function SetupInner({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: window.location.origin + window.location.pathname,
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Bank linking failed", { description: error.message });
      return;
    }
    if (setupIntent?.status === "succeeded") {
      toast.success("US bank account linked");
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ paymentMethodOrder: ["us_bank_account"] }} />
      <Button type="button" className="w-full" disabled={busy || !stripe} onClick={submit}>
        {busy ? "Confirming…" : "Save bank account"}
      </Button>
    </div>
  );
}

function PaymentInner({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: window.location.origin + window.location.pathname,
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Payment confirmation failed", { description: error.message });
      return;
    }
    if (paymentIntent && ["processing", "succeeded", "requires_action"].includes(paymentIntent.status)) {
      toast.success("Payment submitted", { description: `Status: ${paymentIntent.status}` });
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ paymentMethodOrder: ["us_bank_account"] }} />
      <Button type="button" className="w-full" disabled={busy || !stripe} onClick={submit}>
        {busy ? "Confirming…" : "Authorize ACH debit"}
      </Button>
    </div>
  );
}

export function StripeUsBankLinkDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string | null;
  onLinked: () => void;
}) {
  const { open, onOpenChange, customerId, onLinked } = props;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), []);

  useEffect(() => {
    if (!open || !customerId) {
      setClientSecret(null);
      return;
    }
    let cancelled = false;
    (async () => {
      if (!publishableKey) {
        toast.error("Missing VITE_STRIPE_PUBLISHABLE_KEY");
        return;
      }
      const { data, error } = await supabase.functions.invoke("stripe-create-setup-intent", {
        body: { customer_id: customerId },
      });
      if (cancelled) return;
      if (error) {
        toast.error("Could not start Stripe", { description: error.message });
        return;
      }
      if (data?.error) {
        toast.error("Could not start Stripe", { description: String(data.error) });
        return;
      }
      if (data?.client_secret) setClientSecret(data.client_secret as string);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Link US bank (Stripe)</DialogTitle>
        </DialogHeader>
        {!stripePromise || !clientSecret ? (
          <p className="text-sm text-muted-foreground">Preparing secure bank linking…</p>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <SetupInner
              onDone={() => {
                onOpenChange(false);
                setClientSecret(null);
                onLinked();
              }}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function StripePaymentConfirmDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientSecret: string | null;
  onDone: () => void;
}) {
  const { open, onOpenChange, clientSecret, onDone } = props;
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm ACH payment</DialogTitle>
        </DialogHeader>
        {!stripePromise || !clientSecret ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentInner
              onDone={() => {
                onOpenChange(false);
                onDone();
              }}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
