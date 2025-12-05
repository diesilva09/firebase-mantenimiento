"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type SearchSuggestionType = "task" | "form" | "equipo";

export type SearchSuggestion = {
  id: string;
  label: string;
  type: SearchSuggestionType;
  route?: string;
};

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  suggestions: SearchSuggestion[];
  setSuggestions: (items: SearchSuggestion[]) => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function DashboardSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  return (
    <SearchContext.Provider value={{ query, setQuery, suggestions, setSuggestions }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useDashboardSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useDashboardSearch must be used inside DashboardSearchProvider");
  }
  return ctx;
}