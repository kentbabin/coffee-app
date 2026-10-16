"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button, Chip, Field, Icon } from "@/components/ui";
import { TYPE_LABEL } from "@/lib/labels";
import { mapsPinUrl, parseMapsUrl } from "@/lib/maps";
import type { Option, OptionLists } from "@/lib/options";
import { shopFormSchema, type ShopFormValues } from "@/lib/shop-schema";
import { findSimilarShops, saveShop } from "./actions";
import { ChoiceGroup } from "./ChoiceGroup";

export type RoasterOption = { id: string; name: string; city: string | null };
export type ShopFormMode = { kind: "new"; submissionId?: string } | { kind: "edit"; id: string; updatedAt: string };
type Similar = { id: string; name: string; is_hidden: boolean };

/** Choices to offer: active values, plus any retired value the shop already has. */
function choices(options: Option[], selected: string[], by: "slug" | "id") {
  return options.filter((o) => !o.is_retired || selected.includes(o[by])).map((o) => ({ value: o[by], label: o.label }));
}

export function ShopForm({
  options,
  roasters,
  initial,
  mode,
}: {
  options: OptionLists;
  roasters: RoasterOption[];
  initial: ShopFormValues;
  mode: ShopFormMode;
}) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ShopFormValues>({ resolver: zodResolver(shopFormSchema), defaultValues: initial });

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [mapsNote, setMapsNote] = useState<string | null>(null);
  const [similar, setSimilar] = useState<Similar[]>([]);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const [name, areaId, type, lat, lng, newRoasters, roastLevels, processing, preparationIds] = useWatch({
    control,
    name: ["name", "area_id", "type", "lat", "lng", "new_roasters", "roast_levels", "processing", "preparation_ids"],
  });
  const editingId = mode.kind === "edit" ? mode.id : undefined;

  // A2: warn about a shop with a similar name in the same area before saving.
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSimilar(await findSimilarShops(name ?? "", areaId ?? "", editingId));
    }, 400);
    return () => clearTimeout(timer);
  }, [name, areaId, editingId]);

  useEffect(() => {
    if (formError) errorRef.current?.focus();
  }, [formError]);

  const pinOk = lat !== "" && lng !== "" && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  const onSubmit = handleSubmit(
    (values) => {
      setFormError(null);
      startSaving(async () => {
        const result = await saveShop({
          values,
          id: editingId,
          expectedUpdatedAt: mode.kind === "edit" ? mode.updatedAt : undefined,
          submissionId: mode.kind === "new" ? mode.submissionId : undefined,
        });
        if (result.ok) {
          router.push(`/admin?saved=${result.id}`);
          return;
        }
        setFormError(result.error);
        for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
          setError(key as keyof ShopFormValues, { message });
        }
      });
    },
    () => setFormError("Some fields need attention. Check the messages below each one."),
  );

  return (
    <form className="adm-form" onSubmit={onSubmit} noValidate>
      {formError ? (
        <p className="adm-error" role="alert" tabIndex={-1} ref={errorRef}>
          {formError}
        </p>
      ) : null}

      <section className="adm-section" aria-labelledby="sec-shop">
        <h2 id="sec-shop" className="t-title adm-section__title">
          Shop
        </h2>
        <Field id="f-name" label="Name" required autoComplete="off" {...register("name")} error={errors.name?.message} />
        <Field id="f-address" label="Address" required autoComplete="off" {...register("address")} error={errors.address?.message} />
        <Field
          as="select"
          id="f-area"
          label="Area"
          required
          {...register("area_id")}
          error={errors.area_id?.message}
          options={[{ value: "", label: "Choose an area" }, ...choices(options.areas, [initial.area_id], "id")]}
        />
        {similar.length ? (
          <div className="adm-warning" role="status">
            <p>
              <strong>Possible duplicate.</strong> A shop with a similar name is already in this area. Check it isn&apos;t the same shop before saving.
            </p>
            <ul>
              {similar.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/shops/${s.id}`} target="_blank">
                    {s.name}
                  </Link>
                  {s.is_hidden ? " (hidden)" : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Field
          id="f-maps"
          label="Google Maps link"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.google.com/maps/place/…"
          {...register("maps_url", {
            onChange: (e) => {
              const link = parseMapsUrl(e.target.value);
              if (link.kind === "coords") {
                setValue("lat", String(link.lat), { shouldValidate: true });
                setValue("lng", String(link.lng), { shouldValidate: true });
                setMapsNote("Pin read from the link. Check it with Preview on map.");
              } else if (link.kind === "short") {
                setMapsNote("Short links can't be read here. Open the link, copy the full address from the browser bar and paste it, or type the latitude and longitude below.");
              } else {
                setMapsNote(e.target.value.trim() ? "No pin found in this link. Type the latitude and longitude below." : null);
              }
            },
          })}
          error={errors.maps_url?.message}
          hint={mapsNote ?? "Paste the full link from Google Maps. The pin fills in by itself."}
        />
        <div className="adm-grid-2">
          <Field id="f-lat" label="Latitude" inputMode="decimal" autoComplete="off" {...register("lat")} error={errors.lat?.message} />
          <Field id="f-lng" label="Longitude" inputMode="decimal" autoComplete="off" {...register("lng")} error={errors.lng?.message} />
        </div>
        {pinOk ? (
          <p>
            <a href={mapsPinUrl(Number(lat), Number(lng))} target="_blank" rel="noreferrer" className="adm-inline-link">
              Preview on map <Icon name="externalLink" size={14} />
            </a>
          </p>
        ) : null}
      </section>

      <section className="adm-section" aria-labelledby="sec-type">
        <h2 id="sec-type" className="t-title adm-section__title">
          Roaster or maker
        </h2>
        <Controller
          control={control}
          name="type"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              id="f-type"
              label="Type"
              required
              single
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              hint="A roaster roasts beans; a maker serves coffee made from someone else's beans."
              choices={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            />
          )}
        />
        {type !== "roaster" ? (
          <>
            <Controller
              control={control}
              name="roaster_ids"
              render={({ field }) => (
                <ChoiceGroup
                  id="f-roasters"
                  label="Roasters whose beans they serve"
                  value={field.value}
                  onChange={field.onChange}
                  hint={type === "maker" ? "Recommended for makers." : "Optional."}
                  choices={roasters.map((r) => ({ value: r.id, label: r.city ? `${r.name}, ${r.city}` : r.name }))}
                />
              )}
            />
            {newRoasters?.length ? (
              <div className="ca-fgroup__chips" aria-label="Roasters to add">
                {newRoasters.map((r, i) => (
                  <Chip
                    key={`${r.name}-${i}`}
                    removeLabel={`new roaster ${r.name}`}
                    onRemove={() =>
                      setValue(
                        "new_roasters",
                        newRoasters.filter((_, j) => j !== i),
                      )
                    }
                  >
                    New: {r.name}
                  </Chip>
                ))}
              </div>
            ) : null}
            <InlineRoaster
              processing={options.processing_methods}
              onAdd={(r) => setValue("new_roasters", [...(newRoasters ?? []), r])}
            />
          </>
        ) : null}
      </section>

      <section className="adm-section" aria-labelledby="sec-coffee">
        <h2 id="sec-coffee" className="t-title adm-section__title">
          Coffee
        </h2>
        <Controller
          control={control}
          name="roast_levels"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              id="f-roast"
              label="Roast levels"
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              choices={choices(options.roast_levels, roastLevels ?? [], "slug")}
            />
          )}
        />
        <Controller
          control={control}
          name="preparation_ids"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              id="f-preparations"
              label="Preparation"
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              choices={choices(options.preparation_methods, preparationIds ?? [], "id")}
            />
          )}
        />
        <Controller
          control={control}
          name="bean_origin"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              id="f-origin"
              label="Bean origin"
              required
              single
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              choices={choices(options.bean_origins, [initial.bean_origin], "slug")}
            />
          )}
        />
        <Controller
          control={control}
          name="processing"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              id="f-processing"
              label="Processing"
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              choices={choices(options.processing_methods, processing ?? [], "slug")}
            />
          )}
        />
      </section>

      <section className="adm-section" aria-labelledby="sec-details">
        <h2 id="sec-details" className="t-title adm-section__title">
          Details
        </h2>
        <Field
          as="textarea"
          id="f-description"
          label="Description"
          {...register("description")}
          error={errors.description?.message}
          hint="One to three sentences on why this shop matters."
        />
        <div className="adm-grid-2">
          <Field id="f-website" label="Website" type="url" inputMode="url" placeholder="https://" {...register("website")} error={errors.website?.message} />
          <Field id="f-instagram" label="Instagram" placeholder="@handle" autoComplete="off" {...register("instagram")} error={errors.instagram?.message} />
        </div>
      </section>

      {mode.kind === "new" ? (
        <label className="adm-check">
          <input type="checkbox" {...register("is_hidden")} />
          Save as hidden
        </label>
      ) : null}

      <div className="adm-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : mode.kind === "new" && mode.submissionId ? "Approve and save shop" : "Save shop"}
        </Button>
        <Button variant="secondary" href={mode.kind === "new" && mode.submissionId ? "/admin/submissions" : "/admin"}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** "Add roaster" without leaving the form: name, city and processing. */
function InlineRoaster({ processing, onAdd }: { processing: Option[]; onAdd: (r: { name: string; city: string; processing: string[] }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  function add() {
    if (!name.trim()) {
      setError("Enter the roaster's name.");
      return;
    }
    onAdd({ name: name.trim(), city: city.trim(), processing: chosen });
    setName("");
    setCity("");
    setChosen([]);
    setError(undefined);
    setOpen(false);
  }

  // Enter adds the roaster instead of submitting the whole shop form.
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  if (!open) {
    return (
      <div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Icon name="plus" /> Add roaster
        </Button>
      </div>
    );
  }
  return (
    <div className="adm-inline-roaster" role="group" aria-label="New roaster">
      <div className="adm-grid-2" onKeyDown={onKeyDown}>
        <Field id="nr-name" label="Roaster name" required value={name} onChange={(e) => setName(e.target.value)} error={error} autoFocus />
        <Field id="nr-city" label="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <ChoiceGroup id="nr-processing" label="Processing" value={chosen} onChange={setChosen} choices={choices(processing, [], "slug")} />
      <div className="adm-actions">
        <Button variant="secondary" onClick={add}>
          Add to this shop
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
