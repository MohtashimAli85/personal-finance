"use client";
import { useRef, useState } from "react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  type ComboboxProps,
  ComboboxSeparator,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { useStore } from "@/context/store-context";

const CategoryCombobox = ({ value, label, onChange }: ComboboxProps) => {
  const comboBtn = useRef<HTMLButtonElement>(null);
  const groupedCategories = useStore((state) => state.groupedCategories);
  const [inputValue, setInputValue] = useState(label ?? "");

  return (
    <Combobox
      id="categoryId"
      name="categoryId"
      value={{ value, label }}
      onValueChange={(item) => {
        if (!item) return;
        if (item.value !== value && item.value) {
          onChange?.(item.value);
        }
        setInputValue(item.label ?? "");
      }}
      items={groupedCategories}
    >
      <ComboboxTrigger hidden ref={comboBtn} />
      <ComboboxInput
        variant={"table"}
        showTrigger={false}
        placeholder="Select a Category"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => {
          if (!inputValue) setInputValue(label ?? "");
        }}
        onFocus={() => comboBtn.current?.click()}
      />
      <ComboboxContent>
        <ComboboxEmpty>No Categories found.</ComboboxEmpty>
        <ComboboxList>
          {(group, index) => (
            <ComboboxGroup key={group.id} items={group.categories}>
              <ComboboxLabel>{group.name}</ComboboxLabel>
              <ComboboxCollection>
                {(category) => (
                  <ComboboxItem
                    key={category.id}
                    value={{ value: category.id, label: category.name }}
                  >
                    {category.name}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
              {index < (groupedCategories?.length ?? 0) - 1 && (
                <ComboboxSeparator />
              )}
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default CategoryCombobox;
