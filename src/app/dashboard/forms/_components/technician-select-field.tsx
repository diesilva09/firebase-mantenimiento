"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { users } from "@/lib/data";
import type { ControllerRenderProps } from "react-hook-form";

interface TechnicianSelectFieldProps {
  field: ControllerRenderProps<any, string>;
  label: string;
  placeholder?: string;
  inputPlaceholder?: string;
}

export function TechnicianSelectField({
  field,
  label,
  placeholder = "Seleccione otro técnico",
  inputPlaceholder = "Escriba el nombre del técnico",
}: TechnicianSelectFieldProps) {
  const [showInput, setShowInput] = useState(field.value && !users.some(user => user.name === field.value));

  const handleSelectChange = (value: string) => {
    if (value === "otro") {
      setShowInput(true);
      field.onChange("");
    } else {
      setShowInput(false);
      field.onChange(value);
    }
  };

  const getSelectValue = () => {
    if (!field.value) return "";
    return users.some((user) => user.name === field.value) ? field.value : "otro";
  };

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select value={getSelectValue()} onValueChange={handleSelectChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.name}>
              {user.name}
            </SelectItem>
          ))}
          <SelectItem value="otro">Otro técnico</SelectItem>  
        </SelectContent>
      </Select>
      
      {showInput && (
        <FormControl className="mt-2">
          <Input
            placeholder={inputPlaceholder}
            value={field.value ?? ""}
            onChange={(event) => field.onChange(event.target.value)}
            onBlur={field.onBlur}
          />
        </FormControl>
      )}
      <FormMessage />
    </FormItem>
  );
}