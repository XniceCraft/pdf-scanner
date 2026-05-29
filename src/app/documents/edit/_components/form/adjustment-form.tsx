"use client";

import { type Control, Controller, useController } from "react-hook-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SliderField } from "../field/slider-field";

import type { Edit } from "@/types/edit";

interface AdjustmentFormProps {
  control: Control<Edit>;
}

export function AdjustmentForm({ control }: AdjustmentFormProps) {
  const { field: presetField } = useController({
    control,
    name: "preset",
  });

  return (
    <>
      <h2 className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
        Preset
      </h2>
      <Controller
        name="preset"
        control={control}
        render={({ field }) => (
          <Select {...field} onValueChange={(value) => field.onChange(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="item-aligned">
              <SelectGroup>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="enhanced">Enhanced</SelectItem>
                <SelectItem value="no-shadow">No Shadow</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      />
      {presetField.value !== "no-shadow" && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
            Color
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <SliderField
              control={control}
              name="temperature"
              label="Temperature"
              min={-100}
              max={100}
              step={1}
            />
            <SliderField
              control={control}
              name="tint"
              label="Tint"
              min={-100}
              max={100}
              step={1}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
          Lightness
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <SliderField
            control={control}
            name="brightness"
            label="Brightness"
            min={-100}
            max={100}
            step={1}
          />
          <SliderField
            control={control}
            name="contrast"
            label="Contrast"
            min={-100}
            max={100}
            step={1}
          />
          {presetField.value !== "no-shadow" && (
            <>
              <SliderField
                control={control}
                name="highlight"
                label="Highlight"
                min={-100}
                max={100}
                step={1}
              />
              <SliderField
                control={control}
                name="shadow"
                label="Shadow"
                min={-100}
                max={100}
                step={1}
              />
              <SliderField
                control={control}
                name="white"
                label="White"
                min={-100}
                max={100}
                step={1}
              />
              <SliderField
                control={control}
                name="black"
                label="Black"
                min={-100}
                max={100}
                step={1}
              />
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
