"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button, Field } from "@/components/ui";
import type { Option } from "@/lib/options";
import { roasterFormSchema, type RoasterFormValues } from "@/lib/shop-schema";
import { ChoiceGroup } from "../shops/ChoiceGroup";
import { saveRoaster } from "./actions";

export function RoasterForm({
  initial,
  processing,
  id,
}: {
  initial: RoasterFormValues;
  processing: Option[];
  id?: string;
}) {
  const router = useRouter();
  // Unique per form: Next.js keeps left pages in the document, hidden.
  const uid = useId();
  const fid = (name: string) => `${uid}${name}`;
  const [saving, start] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<RoasterFormValues>({ resolver: zodResolver(roasterFormSchema), defaultValues: initial });

  const onSubmit = handleSubmit(
    (values) =>
      start(async () => {
        const result = await saveRoaster({ values, id });
        if (result.ok) {
          if (!id) reset(initial);
          router.push(`/admin/roasters?saved=${result.id}`);
          return;
        }
        setFormError(result.error);
        for (const [key, message] of Object.entries(result.fieldErrors ?? {})) setError(key as keyof RoasterFormValues, { message });
      }),
    () => setFormError("Some fields need attention. Check the messages below each one."),
  );

  return (
    <form className="adm-form" onSubmit={onSubmit} noValidate>
      {formError ? (
        <p className="adm-error" role="alert">
          {formError}
        </p>
      ) : null}
      <section className="adm-section">
        <Field id={fid("r-name")} label="Name" required autoComplete="off" {...register("name")} error={errors.name?.message} />
        <Field id={fid("r-city")} label="City" autoComplete="off" {...register("city")} error={errors.city?.message} hint="Where they roast, for example Kintamani." />
        <Controller
          control={control}
          name="processing"
          render={({ field }) => (
            <ChoiceGroup
              id={fid("r-processing")}
              label="Processing"
              value={field.value}
              onChange={field.onChange}
              choices={processing.filter((o) => !o.is_retired || field.value.includes(o.slug)).map((o) => ({ value: o.slug, label: o.label }))}
            />
          )}
        />
        <Field id={fid("r-website")} label="Website" type="url" inputMode="url" placeholder="https://" {...register("website")} error={errors.website?.message} />
      </section>
      <div className="adm-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save roaster"}
        </Button>
        <Button variant="secondary" href="/admin/roasters">
          Cancel
        </Button>
      </div>
    </form>
  );
}
