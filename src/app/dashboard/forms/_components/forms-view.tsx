"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { FormMetadata } from '@/lib/types';
import { useDashboardSearch, SearchSuggestion } from '@/context/dashboard-search-context';

interface FormsViewProps {
  forms: FormMetadata[];
}

export function FormsView({ forms }: FormsViewProps) {
  const { query, setSuggestions } = useDashboardSearch();
  const normalizedQuery = query.trim().toLowerCase();

  // Registrar sugerencias globales para formularios (título)
  useEffect(() => {
    const items: SearchSuggestion[] = forms.map((form) => ({
      id: form.slug,
      label: form.title,
      type: 'form',
      route: `/dashboard/forms/${form.slug}`,
    }));
    setSuggestions(items);
  }, [forms, setSuggestions]);

  const filteredForms = !normalizedQuery
    ? forms
    : forms.filter((form) => {
        const haystack = `${form.title} ${form.description ?? ''}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredForms.map((form) => (
        <Card key={form.slug}>
          <CardHeader>
            <CardTitle>{form.title}</CardTitle>
            <CardDescription>{form.description}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
                <Link href={`/dashboard/forms/${form.slug}`}>
                  Abrir Formulario <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
