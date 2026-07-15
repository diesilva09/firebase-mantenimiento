"use client"

import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

interface TimeSelectFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  id?: string
}

function parseTime(value: string): { hora: string; minuto: string } {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) {
    return { hora: "", minuto: "" }
  }
  const [h, m] = value.split(":")
  return { hora: h.padStart(2, "0"), minuto: m }
}

export function TimeSelectField({
  value,
  onChange,
  onBlur,
  placeholder = "Seleccione hora",
  id,
}: TimeSelectFieldProps) {
  const { hora, minuto } = parseTime(value)

  function updateTime(nuevaHora: string, nuevoMinuto: string) {
    onChange(`${nuevaHora}:${nuevoMinuto}`)
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) onBlur?.()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start pl-3 font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className={cn(value && "font-mono")}>
            {value ? `${value.split(":").map((p, i) => (i === 0 ? p.padStart(2, "0") : p)).join(":")}` : placeholder}
          </span>
          <Clock className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Seleccionar hora</p>
        <div className="flex items-center gap-2">
          <Select
            value={hora}
            onValueChange={(h) => updateTime(h, minuto || "00")}
          >
            <SelectTrigger className="w-[88px] font-mono">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent className="max-h-52">
              {HORAS.map((h) => (
                <SelectItem key={h} value={h} className="font-mono">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-lg font-semibold text-muted-foreground">:</span>
          <Select
            value={minuto}
            onValueChange={(m) => updateTime(hora || "00", m)}
          >
            <SelectTrigger className="w-[88px] font-mono">
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent className="max-h-52">
              {MINUTOS.map((m) => (
                <SelectItem key={m} value={m} className="font-mono">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
