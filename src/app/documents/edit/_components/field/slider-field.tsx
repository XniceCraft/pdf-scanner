import { useId } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";
import {
  Editable,
  EditableArea,
  EditableInput,
  EditablePreview,
} from "@/components/ui/editable";

interface SliderFieldProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  label: string;
  max: number;
  min: number;
  name: Path<TFieldValues>;
  step: number;
}

export function SliderField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label,
  min,
  max,
  step,
}: SliderFieldProps<TFieldValues>) {
  const id = useId();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={id} onDoubleClick={() => field.onChange(0)}>
              {label}
            </FieldLabel>

            <Editable
              {...field}
              value={field.value.toString()}
              onChange={undefined}
              onValueChange={(value) => {
                const newVal = Number(value);
                if (Number.isNaN(newVal)) {
                  field.onChange(0);
                  return;
                }
                if (newVal > max) {
                  field.onChange(max);
                  return;
                }
                if (newVal < min) {
                  field.onChange(min);
                  return;
                }

                field.onChange(newVal);
              }}
            >
              <EditableArea>
                <EditablePreview className="w-10 text-center px-1" />
                <EditableInput className="w-10 text-center px-1" />
              </EditableArea>
            </Editable>
          </div>

          <Slider
            {...field}
            onChange={undefined}
            id={id}
            aria-invalid={fieldState.invalid}
            value={[field.value]}
            onValueChange={(value) => field.onChange(value[0])}
            onDoubleClick={() => field.onChange(0)}
            min={min}
            max={max}
            step={step}
          />

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
