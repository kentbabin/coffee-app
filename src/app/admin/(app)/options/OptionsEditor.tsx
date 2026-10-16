"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Field, Icon, StatusTag } from "@/components/ui";
import type { Option, OptionListKey } from "@/lib/options";
import { addOption, deleteOption, moveOption, updateOption } from "./actions";

type Result = { ok: true } | { ok: false; error: string };

export function OptionsEditor({ list, singular, options }: { list: OptionListKey; singular: string; options: Option[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [newLabel, setNewLabel] = useState("");
  const [newRegion, setNewRegion] = useState("Bali");
  const isAreas = list === "areas";
  const article = /^[aeiou]/i.test(singular) ? "an" : "a";

  function run(action: () => Promise<Result>, after?: () => void) {
    setError(undefined);
    start(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else after?.();
      router.refresh();
    });
  }

  function onAdd(e: FormEvent) {
    e.preventDefault();
    run(() => addOption(list, newLabel, newRegion), () => setNewLabel(""));
  }

  return (
    <div className="adm-stack">
      {error ? (
        <p className="adm-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="adm-options" aria-label={`${singular} values, in display order`} aria-busy={pending}>
        {options.map((o, i) => (
          <OptionRow
            key={`${o.id}-${o.label}-${o.region ?? ""}`}
            option={o}
            isAreas={isAreas}
            first={i === 0}
            last={i === options.length - 1}
            disabled={pending}
            onSave={(changes) => run(() => updateOption(list, o.id, changes))}
            onMove={(dir) => run(() => moveOption(list, o.id, dir))}
            onRetire={() => run(() => updateOption(list, o.id, { is_retired: !o.is_retired }))}
            onDelete={() => {
              if (window.confirm(`Delete "${o.label}"? This can't be undone.`)) run(() => deleteOption(list, o.id));
            }}
          />
        ))}
      </ul>
      <form className="adm-section" onSubmit={onAdd} aria-labelledby="add-option">
        <h2 id="add-option" className="t-title">
          Add {article} {singular}
        </h2>
        <div className="adm-grid-2">
          <Field id="new-label" label="Name" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} required />
          {isAreas ? <Field id="new-region" label="Region" value={newRegion} onChange={(e) => setNewRegion(e.target.value)} hint="For example Bali or Java." /> : null}
        </div>
        <div>
          <Button type="submit" variant="secondary" disabled={pending || !newLabel.trim()}>
            <Icon name="plus" /> Add {singular}
          </Button>
        </div>
      </form>
    </div>
  );
}

function OptionRow({
  option,
  isAreas,
  first,
  last,
  disabled,
  onSave,
  onMove,
  onRetire,
  onDelete,
}: {
  option: Option;
  isAreas: boolean;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onSave: (changes: { label: string; region?: string }) => void;
  onMove: (dir: -1 | 1) => void;
  onRetire: () => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(option.label);
  const [region, setRegion] = useState(option.region ?? "");
  const dirty = label !== option.label || (isAreas && region !== (option.region ?? ""));

  return (
    <li className={option.is_retired ? "adm-option is-retired" : "adm-option"}>
      <div className="adm-option__fields">
        <input aria-label={`Name of ${option.label}`} value={label} onChange={(e) => setLabel(e.target.value)} />
        {isAreas ? <input aria-label={`Region of ${option.label}`} value={region} onChange={(e) => setRegion(e.target.value)} size={10} /> : null}
        {option.is_retired ? <StatusTag kind="hidden">Retired</StatusTag> : null}
      </div>
      <div className="adm-option__buttons">
        {dirty ? (
          <button type="button" className="adm-icon-btn" disabled={disabled} onClick={() => onSave({ label, region })}>
            Save
          </button>
        ) : null}
        <button type="button" className="adm-icon-btn" disabled={disabled || first} onClick={() => onMove(-1)} aria-label={`Move ${option.label} up`}>
          <Icon name="chevronUp" size={16} />
        </button>
        <button type="button" className="adm-icon-btn" disabled={disabled || last} onClick={() => onMove(1)} aria-label={`Move ${option.label} down`}>
          <Icon name="chevronDown" size={16} />
        </button>
        <button type="button" className="adm-icon-btn" disabled={disabled} onClick={onRetire}>
          {option.is_retired ? "Restore" : "Retire"}
        </button>
        <button type="button" className="adm-icon-btn" disabled={disabled} onClick={onDelete} aria-label={`Delete ${option.label}`}>
          Delete
        </button>
      </div>
    </li>
  );
}
