"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field } from "@/components/ui";
import { rejectSubmission } from "./actions";

export function RejectButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} aria-label={`Reject ${name}`}>
        Reject
      </Button>
    );
  }
  return (
    <div className="adm-inline-roaster">
      <Field
        as="textarea"
        id={`reason-${id}`}
        label="Reason"
        hint="Optional. Only admins see it."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={error}
        autoFocus
      />
      <div className="adm-actions">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await rejectSubmission(id, reason);
              if (!result.ok) {
                setError(`The submission couldn't be rejected: ${result.error}`);
                return;
              }
              router.refresh();
            })
          }
        >
          {pending ? "Rejecting…" : "Reject submission"}
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
