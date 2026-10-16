"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { setShopHidden } from "../actions";

export function HideToggle({ id, hidden, name }: { id: string; hidden: boolean; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <Button
        variant="secondary"
        disabled={pending}
        aria-label={`${hidden ? "Unhide" : "Hide"} ${name}`}
        onClick={() =>
          start(async () => {
            const result = await setShopHidden(id, !hidden);
            if (!result.ok) setError(result.error);
            router.refresh();
          })
        }
      >
        {hidden ? "Unhide shop" : "Hide shop"}
      </Button>
      {error ? (
        <p className="ca-field__msg ca-field__msg--error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
