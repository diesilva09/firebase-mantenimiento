"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { technicians } from "@/lib/technicians";
import type { ControllerRenderProps } from "react-hook-form";

interface TechnicianSelectFieldProps {
  field: ControllerRenderProps<any, string>;
  label: string;
  placeholder?: string;
  inputPlaceholder?: string;
}

const PERSONAL_EXTERNO_VALUE = "__personal_externo__";
const OTRO_TECNICO_VALUE = "__otro_tecnico__";

export function TechnicianSelectField({
  field,
  label,
  placeholder = "Seleccione quien ejecutó",
  inputPlaceholder = "Escriba el nombre",
}: TechnicianSelectFieldProps) {
  // Verificar el tipo de valor actual
  const isPersonalExterno = field.value?.startsWith("Personal externo - ");
  const isOtroTecnico = field.value && !technicians.some(user => user.name === field.value) && !isPersonalExterno;

  const [externalName, setExternalName] = useState(() => {
    if (isPersonalExterno) return field.value.replace("Personal externo - ", "");
    if (isOtroTecnico) return field.value;
    return "";
  });

  const [inputMode, setInputMode] = useState<"personal_externo" | "otro" | null>(
    isPersonalExterno ? "personal_externo" : isOtroTecnico ? "otro" : null
  );

  // Sincronizar estado interno cuando el valor del campo cambia externamente (ej. form.reset)
  useEffect(() => {
    const newIsPersonalExterno = field.value?.startsWith("Personal externo - ");
    const newIsOtroTecnico = field.value && !technicians.some(user => user.name === field.value) && !newIsPersonalExterno;

    if (newIsPersonalExterno) {
      setInputMode("personal_externo");
      setExternalName(field.value.replace("Personal externo - ", ""));
    } else if (newIsOtroTecnico) {
      setInputMode("otro");
      setExternalName(field.value);
    } else {
      setInputMode(null);
      setExternalName("");
    }
  }, [field.value]);

  const handleSelectChange = (value: string) => {
    if (value === PERSONAL_EXTERNO_VALUE) {
      setInputMode("personal_externo");
      field.onChange(externalName ? `Personal externo - ${externalName}` : "");
    } else if (value === OTRO_TECNICO_VALUE) {
      setInputMode("otro");
      field.onChange(externalName || "");
    } else {
      setInputMode(null);
      setExternalName("");
      field.onChange(value);
    }
  };

  const handleExternalNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    setExternalName(name);
    if (inputMode === "personal_externo") {
      field.onChange(name ? `Personal externo - ${name}` : "");
    } else {
      field.onChange(name);
    }
  };

  const getSelectValue = () => {
    if (!field.value) return "";
    // Si es personal externo, retornar el valor especial
    if (field.value?.startsWith("Personal externo - ")) return PERSONAL_EXTERNO_VALUE;
    // Si es otro técnico (no está en la lista y no es personal externo)
    if (!technicians.some((user) => user.name === field.value)) return OTRO_TECNICO_VALUE;
    // Si es un usuario de la lista, retornar el nombre
    return field.value;
  };

  const getInputPlaceholder = () => {
    if (inputMode === "personal_externo") return "Escriba el nombre del personal externo";
    return "Escriba el nombre del técnico";
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
          {technicians.map((user) => (
            <SelectItem key={user.id} value={user.name}>
              {user.name}
            </SelectItem>
          ))}
          <SelectItem value={OTRO_TECNICO_VALUE}>Otro técnico</SelectItem>
          <SelectItem value={PERSONAL_EXTERNO_VALUE}>Personal externo</SelectItem>  
        </SelectContent>
      </Select>
      
      {inputMode && (
        <FormControl className="mt-2">
          <Input
            placeholder={getInputPlaceholder()}
            value={externalName}
            onChange={handleExternalNameChange}
            onBlur={field.onBlur}
          />
        </FormControl>
      )}
      <FormMessage />
    </FormItem>
  );
}