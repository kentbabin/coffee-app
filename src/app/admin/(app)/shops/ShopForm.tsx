"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button, Chip, Field, Icon } from "@/components/ui";
import { TYPE_LABEL, type ShopType } from "@/lib/labels";
import { isGoogleMapsUrl } from "@/lib/maps";
import type { Option, OptionLists } from "@/lib/options";
import { shopFormSchema, slugify, type ShopFormValues } from "@/lib/shop-schema";
import { findSimilarShops, saveShop } from "./actions";
import { ChoiceGroup } from "./ChoiceGroup";

export type RoasterOption = { id: string; name: string; city: string | null };
export type ShopFormMode = { kind: "new"; submissionId?: string } | { kind: "edit"; id: string; updatedAt: string };
type Similar = { id: string; name: string; is_hidden: boolean };

const TYPE_ORDER: ShopType[] = ["brewer", "both"];

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
  // Next.js keeps pages you leave in the document, hidden; unique ids keep
  // each label pointing at its own form's field.
  const uid = useId();
  const fid = (name: string) => `${uid}${name}`;
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<ShopFormValues>({ resolver: zodResolver(shopFormSchema), defaultValues: initial });

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [similar, setSimilar] = useState<Similar[]>([]);
  // A new shop's link follows its name until the admin edits the link.
  const [slugEdited, setSlugEdited] = useState(mode.kind === "edit" || initial.slug !== "");
  const errorRef = useRef<HTMLParagraphElement>(null);

  const [name, areaId, type, slug, mapsUrl, newRoasters, roastLevels, processing, preparationIds, ownRoasterId, roasterIds] = useWatch({
    control,
    name: ["name", "area_id", "type", "slug", "maps_url", "new_roasters", "roast_levels", "processing", "preparation_ids", "own_roaster_id", "roaster_ids"],
  });
  const roasterChoices = roasters.map((r) => ({ value: r.id, label: r.city ? `${r.name}, ${r.city}` : r.name }));
  // A shop has at most one own roastery: picking one clears any other.
  function setOwnRoaster(id: string) {
    setValue("own_roaster_id", id);
    if (id) {
      setValue("roaster_ids", (roasterIds ?? []).filter((r) => r !== id));
      setValue("new_roasters", (newRoasters ?? []).map((r) => ({ ...r, own: false })));
    }
  }
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
          // The add page stays in the document; start it fresh for the next shop.
          if (mode.kind === "new") {
            reset(initial);
            setSlugEdited(initial.slug !== "");
          }
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

      <section className="adm-section" aria-labelledby={fid("sec-shop")}>
        <h2 id={fid("sec-shop")} className="t-title adm-section__title">
          Shop
        </h2>
        <Field
          id={fid("f-name")}
          label="Name"
          required
          autoComplete="off"
          {...register("name", { onChange: (e) => !slugEdited && setValue("slug", slugify(e.target.value)) })}
          error={errors.name?.message}
        />
        <Field
          id={fid("f-slug")}
          label="Slug"
          autoComplete="off"
          spellCheck={false}
          {...register("slug", { onChange: () => setSlugEdited(true) })}
          error={errors.slug?.message}
          hint={
            mode.kind === "edit"
              ? `The page is at /shops/${slug || "…"}. If you change it, old links still lead here.`
              : `The page will be at /shops/${slug || "…"}. It follows the name unless you change it.`
          }
        />
        <Field id={fid("f-address")} label="Address" required autoComplete="off" {...register("address")} error={errors.address?.message} />
        <Field
          as="select"
          id={fid("f-area")}
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
          id={fid("f-maps")}
          label="Google Maps link"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://maps.app.goo.gl/…"
          {...register("maps_url")}
          error={errors.maps_url?.message}
          hint={
            mapsUrl && !isGoogleMapsUrl(mapsUrl)
              ? "This doesn't look like a Google Maps link. The map on the shop page needs one."
              : "Paste a share link or the full link from Google Maps. The map pin comes from it."
          }
        />
        {mapsUrl && isGoogleMapsUrl(mapsUrl) ? (
          <p>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="adm-inline-link">
              Check the link <Icon name="externalLink" size={14} />
            </a>
          </p>
        ) : null}
      </section>

      <section className="adm-section" aria-labelledby={fid("sec-type")}>
        <h2 id={fid("sec-type")} className="t-title adm-section__title">
          Roaster or brewer
        </h2>
        <Controller
          control={control}
          name="type"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              id={fid("f-type")}
              label="Type"
              required
              single
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              hint={
                type === "both"
                  ? "Roasts its own beans, in house or at its group's roastery."
                  : "Serves coffee made from other roasters' beans."
              }
              choices={TYPE_ORDER.map((value) => ({ value, label: TYPE_LABEL[value] }))}
            />
          )}
        />
        {/* The roastery that roasts for this shop. Saving never creates one from the shop. */}
        {type === "both" ? (
          <ChoiceGroup
            id={fid("f-own-roaster")}
            label="Their own roastery"
            single
            value={ownRoasterId ?? ""}
            // Picking the chosen roastery again clears it.
            onChange={(id) => setOwnRoaster(id === ownRoasterId ? "" : id)}
            hint="Optional. The roaster that roasts for this shop, which can roast for other shops in the same group too. Add it below if it's new."
            choices={roasterChoices}
          />
        ) : null}
        <Controller
          control={control}
          name="roaster_ids"
          render={({ field }) => (
            <ChoiceGroup
              id={fid("f-roasters")}
              label={type === "both" ? "Other roasters whose beans they serve" : "Roasters whose beans they serve"}
              value={field.value}
              onChange={field.onChange}
              hint={type === "both" ? "Optional." : "Recommended."}
              choices={type === "both" ? roasterChoices.filter((c) => c.value !== ownRoasterId) : roasterChoices}
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
                {r.own && type === "both" ? " (their roastery)" : ""}
              </Chip>
            ))}
          </div>
        ) : null}
        <InlineRoaster
          processing={options.processing_methods}
          canBeOwn={type === "both"}
          onAdd={(r) => {
            const others = newRoasters ?? [];
            if (r.own) {
              // The new roaster becomes their roastery, in place of any other.
              setValue("own_roaster_id", "");
              setValue("new_roasters", [...others.map((o) => ({ ...o, own: false })), r]);
            } else {
              setValue("new_roasters", [...others, r]);
            }
          }}
        />
      </section>

      <section className="adm-section" aria-labelledby={fid("sec-coffee")}>
        <h2 id={fid("sec-coffee")} className="t-title adm-section__title">
          Coffee
        </h2>
        <Controller
          control={control}
          name="roast_levels"
          render={({ field, fieldState }) => (
            <ChoiceGroup
              id={fid("f-roast")}
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
              id={fid("f-preparations")}
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
              id={fid("f-origin")}
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
              id={fid("f-processing")}
              label="Processing"
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              choices={choices(options.processing_methods, processing ?? [], "slug")}
            />
          )}
        />
        <label className="adm-check">
          <input type="checkbox" {...register("serves_geisha")} />
          Geisha beans on offer
        </label>
      </section>

      <section className="adm-section" aria-labelledby={fid("sec-details")}>
        <h2 id={fid("sec-details")} className="t-title adm-section__title">
          Details
        </h2>
        <Field
          as="textarea"
          id={fid("f-description")}
          label="Description"
          {...register("description")}
          error={errors.description?.message}
          hint="One to three sentences on why this shop matters."
        />
        <div className="adm-grid-2">
          <Field id={fid("f-website")} label="Website" type="url" inputMode="url" placeholder="https://" {...register("website")} error={errors.website?.message} />
          <Field id={fid("f-instagram")} label="Instagram" placeholder="@handle" autoComplete="off" {...register("instagram")} error={errors.instagram?.message} />
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

/** "Add roaster" without leaving the form: name, city and processing, and for a shop that roasts, whether it's their roastery. */
function InlineRoaster({
  processing,
  canBeOwn,
  onAdd,
}: {
  processing: Option[];
  canBeOwn: boolean;
  onAdd: (r: { name: string; city: string; processing: string[]; own: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [own, setOwn] = useState(false);
  const [error, setError] = useState<string>();
  const uid = useId();
  const fid = (name: string) => `${uid}${name}`;

  function add() {
    if (!name.trim()) {
      setError("Enter the roaster's name.");
      return;
    }
    onAdd({ name: name.trim(), city: city.trim(), processing: chosen, own: canBeOwn && own });
    setName("");
    setCity("");
    setChosen([]);
    setOwn(false);
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
        <Field id={fid("nr-name")} label="Roaster name" required value={name} onChange={(e) => setName(e.target.value)} error={error} autoFocus />
        <Field id={fid("nr-city")} label="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <ChoiceGroup id={fid("nr-processing")} label="Processing" value={chosen} onChange={setChosen} choices={choices(processing, [], "slug")} />
      {canBeOwn ? (
        <label className="adm-check">
          <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} />
          This is their own roastery
        </label>
      ) : null}
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
