"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { FormMetadata } from '@/lib/types';
import { useDashboardSearch, SearchSuggestion } from '@/context/dashboard-search-context';
import { useUserRole } from '@/context/user-role-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SolicitudesMantenimientoForm } from './solicitudes-mantenimiento-form';

interface FormsViewProps {
  forms: FormMetadata[];
}

export function FormsView({ forms }: FormsViewProps) {
  const { query, setSuggestions } = useDashboardSearch();
  const normalizedQuery = query.trim().toLowerCase();
  const { userRole } = useUserRole();
  const [inviteRequestModalOpen, setInviteRequestModalOpen] = useState(false);

  // Filtrar formularios según el rol
  const roleFilteredForms = useMemo(
    () =>
      userRole?.role === 'INVITADO'
        ? forms.filter((form) => form.slug === 'solicitudes-mantenimiento')
        : forms,
    [forms, userRole?.role]
  );

  const searchSuggestions = useMemo<SearchSuggestion[]>(
    () =>
      roleFilteredForms.map((form) => ({
        id: form.slug,
        label: form.title,
        type: 'form',
        route: `/dashboard/forms/${form.slug}`,
      })),
    [roleFilteredForms]
  );

  // Registrar sugerencias globales para formularios (título)
  useEffect(() => {
    setSuggestions(searchSuggestions);
  }, [searchSuggestions, setSuggestions]);

  const filteredForms = useMemo(
    () =>
      !normalizedQuery
        ? roleFilteredForms
        : roleFilteredForms.filter((form) => {
            const haystack = `${form.title} ${form.description ?? ''}`.toLowerCase();
            return haystack.includes(normalizedQuery);
          }),
    [normalizedQuery, roleFilteredForms]
  );

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredForms.map((form) => (
        <Card key={form.slug}>
          <CardHeader>
            <CardTitle>{form.title}</CardTitle>
            <CardDescription>{form.description}</CardDescription>
          </CardHeader>
          <CardFooter>
            {userRole?.role === 'INVITADO' && form.slug === 'solicitudes-mantenimiento' ? (
              <Button className="w-full" onClick={() => setInviteRequestModalOpen(true)}>
                Registrar Solicitud <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button asChild className="w-full">
                  <Link href={`/dashboard/forms/${form.slug}`}>
                    Abrir Formulario <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}

      <Dialog open={inviteRequestModalOpen} onOpenChange={setInviteRequestModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Solicitud de Mantenimiento</DialogTitle>
            <DialogDescription>
              Completa el formulario para registrar tu solicitud.
            </DialogDescription>
          </DialogHeader>
          <SolicitudesMantenimientoForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
