"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const formSchema = z.object({
  fecha: z.date({ required_error: "La fecha es requerida." }),
  energia: z.number().min(0, "El valor no puede ser negativo."),
  medidorGasPrincipal: z.number().min(0, "El valor no puede ser negativo."),
  aguaCalderaManana: z.number().min(0, "El valor no puede ser negativo."),
  aguaCalderaTarde: z.number().min(0, "El valor no puede ser negativo."),
  aguaSalsasManana: z.number().min(0, "El valor no puede ser negativo."),
  aguaSalsasTarde: z.number().min(0, "El valor no puede ser negativo."),
  aguaFrutosManana: z.number().min(0, "El valor no puede ser negativo."),
  aguaFrutosTarde: z.number().min(0, "El valor no puede ser negativo."),
  aguaAutoclaveManana: z.number().min(0, "El valor no puede ser negativo."),
  aguaAutoclaveTarde: z.number().min(0, "El valor no puede ser negativo."),
  aguaContadorPrincipal: z.number().min(0, "El valor no puede ser negativo."),
})

export function ConsumptionForm() {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      energia: 0,
      medidorGasPrincipal: 0,
      aguaCalderaManana: 0,
      aguaCalderaTarde: 0,
      aguaSalsasManana: 0,
      aguaSalsasTarde: 0,
      aguaFrutosManana: 0,
      aguaFrutosTarde: 0,
      aguaAutoclaveManana: 0,
      aguaAutoclaveTarde: 0,
      aguaContadorPrincipal: 0,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
  try {
    // Preparar datos para la base de datos (formato consolidado)
    const consumoData = {
      tipo_registro: 'consolidado',
      fecha: values.fecha.toISOString().split('T')[0],
      energia_kwh: values.energia,
      gas_principal_m3: values.medidorGasPrincipal,
      agua_principal_m3: values.aguaContadorPrincipal,
      agua_caldera_manana_m3: values.aguaCalderaManana,
      agua_caldera_tarde_m3: values.aguaCalderaTarde,
      agua_salsas_manana_m3: values.aguaSalsasManana,
      agua_salsas_tarde_m3: values.aguaSalsasTarde,
      agua_frutos_manana_m3: values.aguaFrutosManana,
      agua_frutos_tarde_m3: values.aguaFrutosTarde,
      agua_autoclave_manana_m3: values.aguaAutoclaveManana,
      agua_autoclave_tarde_m3: values.aguaAutoclaveTarde,
      observaciones: 'Registro diario consolidado de servicios'
    };

    console.log('Enviando consumo consolidado a la BD:', consumoData);

    // Guardar en la base de datos
    const response = await fetch('/api/consumos-servicios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consumoData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al guardar en la BD');
    }

    const nuevoConsumo = await response.json();

    toast({
      title: "✅ Consumo Guardado en BD",
      description: `Registro diario de servicios guardado exitosamente`,
    });
    
    form.reset();

  } catch (error) {
    console.error('Error guardando consumo:', error);
    toast({
      title: "❌ Error",
      description: error instanceof Error ? error.message : "No se pudo guardar el consumo",
      variant: "destructive",
    });
  }
}

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Fecha de Medición</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        >
                        {field.value ? (
                            format(field.value, "PPP")
                        ) : (
                            <span>Seleccione una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid md:grid-cols-3 gap-8">
          <FormField
            control={form.control}
            name="energia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Energía (kWh)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Ej: 1500" 
                    value={field.value === 0 ? '' : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        field.onChange(0);
                      } else {
                        const numValue = parseFloat(value);
                        field.onChange(isNaN(numValue) ? 0 : numValue);
                      }
                    }}
                    onFocus={(e) => {
                      if (field.value === 0) {
                        e.target.value = '';
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        field.onChange(0);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="medidorGasPrincipal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medidor de Gas Natural Principal (m³)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Ej: 120" 
                    value={field.value === 0 ? '' : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        field.onChange(0);
                      } else {
                        const numValue = parseFloat(value);
                        field.onChange(isNaN(numValue) ? 0 : numValue);
                      }
                    }}
                    onFocus={(e) => {
                      if (field.value === 0) {
                        e.target.value = '';
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        field.onChange(0);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="aguaContadorPrincipal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Consumo Agua Contador Principal (m³)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Ej: 25.5" 
                    value={field.value === 0 ? '' : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        field.onChange(0);
                      } else {
                        const numValue = parseFloat(value);
                        field.onChange(isNaN(numValue) ? 0 : numValue);
                      }
                    }}
                    onFocus={(e) => {
                      if (field.value === 0) {
                        e.target.value = '';
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        field.onChange(0);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Caldera</h3>
          <div className="grid md:grid-cols-2 gap-8 mt-4">
            <FormField
              control={form.control}
              name="aguaCalderaManana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo Caldera Mañana (m³)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 10" 
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onFocus={(e) => {
                        if (field.value === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          field.onChange(0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aguaCalderaTarde"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo Caldera Tarde (m³)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 12" 
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onFocus={(e) => {
                        if (field.value === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          field.onChange(0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Planta de Salsas</h3>
          <div className="grid md:grid-cols-2 gap-8 mt-4">
            <FormField
              control={form.control}
              name="aguaSalsasManana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo Salsas Mañana (m³)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 8" 
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onFocus={(e) => {
                        if (field.value === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          field.onChange(0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aguaSalsasTarde"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo Salsas Tarde (m³)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 7" 
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onFocus={(e) => {
                        if (field.value === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          field.onChange(0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Planta de Frutos</h3>
          <div className="grid md:grid-cols-2 gap-8 mt-4">
            <FormField
              control={form.control}
              name="aguaFrutosManana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo Frutos Mañana (m³)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 5" 
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onFocus={(e) => {
                        if (field.value === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          field.onChange(0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aguaFrutosTarde"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo Frutos Tarde (m³)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 6" 
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onFocus={(e) => {
                        if (field.value === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          field.onChange(0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Autoclave</h3>
          <div className="grid md:grid-cols-2 gap-8 mt-4">
            <FormField
              control={form.control}
              name="aguaAutoclaveManana"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo Autoclave Mañana (m³)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 9" 
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onFocus={(e) => {
                        if (field.value === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          field.onChange(0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aguaAutoclaveTarde"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo Autoclave Tarde (m³)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 11" 
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          field.onChange(0);
                        } else {
                          const numValue = parseFloat(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onFocus={(e) => {
                        if (field.value === 0) {
                          e.target.value = '';
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          field.onChange(0);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <Button type="submit">Guardar Consumo</Button>
      </form>
    </Form>
  )
}