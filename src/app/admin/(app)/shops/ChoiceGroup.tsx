"use client";

import { Chip } from "@/components/ui";

type Choice = { value: string; label: string };

type ChoiceGroupProps = {
  id: string;
  label: string;
  choices: Choice[];
  error?: string;
  hint?: string;
  required?: boolean;
} & ({ single: true; value: string; onChange: (value: string) => void } | { single?: false; value: string[]; onChange: (value: string[]) => void });

/** A labelled set of chips for picking one or several options in a form. */
export function ChoiceGroup(props: ChoiceGroupProps) {
  const { id, label, choices, error, hint, required } = props;
  const isOn = (v: string) => (props.single ? props.value === v : props.value.includes(v));

  function toggle(v: string) {
    if (props.single) props.onChange(v);
    else props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
  }

  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <fieldset className="ca-fgroup" id={id} aria-describedby={messageId} aria-invalid={error ? true : undefined} tabIndex={-1}>
      <legend className="ca-field__label adm-choice-legend">
        {label}
        {required ? <span className="ca-field__req"> required</span> : null}
      </legend>
      <div className="ca-fgroup__chips">
        {choices.map((c) => (
          <Chip key={c.value} selected={isOn(c.value)} onToggle={() => toggle(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>
      {error ? (
        <p id={`${id}-error`} className="ca-field__msg ca-field__msg--error adm-choice-msg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="ca-field__msg adm-choice-msg">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
