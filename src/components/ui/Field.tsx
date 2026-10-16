import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

type Common = {
  /** Required: links the label, hint and error to the control. */
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  /** Replaces the hint and marks the control invalid. */
  error?: string;
  className?: string;
};

type InputProps = Common & { as?: "input" } & Omit<ComponentProps<"input">, "id" | "className">;
type SelectProps = Common & { as: "select"; options: { value: string; label: string }[] } & Omit<ComponentProps<"select">, "id" | "className">;
type TextareaProps = Common & { as: "textarea" } & Omit<ComponentProps<"textarea">, "id" | "className">;

export type FieldProps = InputProps | SelectProps | TextareaProps;

/** A labelled text input, select or textarea for admin and submission forms. */
export function Field(props: FieldProps) {
  const { id, label, hint, error, className } = props;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const a11y = { id, className: "ca-field__control", "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };

  let control: ReactNode;
  if (props.as === "select") {
    const { as, options, label, hint, error, className, id, ...rest } = props;
    control = (
      <select {...a11y} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (props.as === "textarea") {
    const { as, label, hint, error, className, id, ...rest } = props;
    control = <textarea rows={3} {...a11y} {...rest} />;
  } else {
    const { as, label, hint, error, className, id, type = "text", ...rest } = props;
    control = <input type={type} {...a11y} {...rest} />;
  }

  return (
    <div className={cx("ca-field", className)}>
      <label className="ca-field__label" htmlFor={id}>
        {label}
        {props.required ? <span className="ca-field__req"> required</span> : null}
      </label>
      {control}
      {error ? (
        <p id={`${id}-error`} className="ca-field__msg ca-field__msg--error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="ca-field__msg">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
