"use client";
import { getAllCategories } from "@/app/actions/category/queries";
import { Category } from "@/app/actions/types";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxProps,
} from "@/components/ui/combobox";
import useQuery from "@/hooks/use-query";
import { useState } from "react";

const CategoryCombobox = ({ value, label, onChange }: ComboboxProps) => {
  const { data: categories } = useQuery<Category[]>({
    queryKey: "Categories",
    queryFn: getAllCategories,
  });
  const [inputValue, setInputValue] = useState(label);
  const items = categories?.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  return (
    <Combobox
      id="CategoryId"
      name="CategoryId"
      value={{ value, label }}
      onValueChange={(item) => {
        if (!item) return;
        if (item.value !== value) {
          onChange(item.value);
        }
        setInputValue(item.label);
      }}
      items={items}
    >
      <ComboboxInput
        placeholder="Select a Category"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => {
          if (!inputValue) setInputValue(label);
        }}
      />
      <ComboboxContent>
        <ComboboxEmpty>No Categories found.</ComboboxEmpty>
        <ComboboxList>
          {(category) => (
            <ComboboxItem key={category.value} value={category}>
              {category.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default CategoryCombobox;
