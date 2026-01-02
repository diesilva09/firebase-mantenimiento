"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

export type SearchSuggestionType =
  | "task"
  | "task_alert"
  | "form"
  | "equipo"
  | "repuesto"
  | "zona"
  | "manual";

export type SearchSuggestion = {
  id: string;
  label: string;
  type: SearchSuggestionType;
  route?: string;
  searchTerms?: string;
};

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  suggestions: SearchSuggestion[];
  setSuggestions: Dispatch<SetStateAction<SearchSuggestion[]>>;
  // Id of the suggestion currently highlighted (previewed) by the search UI
  highlightedSuggestionId: string | null;
  setHighlightedSuggestionId: Dispatch<SetStateAction<string | null>>;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function DashboardSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [highlightedSuggestionId, setHighlightedSuggestionId] = useState<string | null>(null);

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        suggestions,
        setSuggestions,
        highlightedSuggestionId,
        setHighlightedSuggestionId,
      }}
    >
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