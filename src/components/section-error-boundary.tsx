"use client"

import React from "react"
import { ErrorFallback } from "@/components/error-fallback"

interface SectionErrorBoundaryProps {
  children: React.ReactNode
  title?: string
}

interface SectionErrorBoundaryState {
  hasError: boolean
}

export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error("Error en sección:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          title={this.props.title ?? "Error en esta sección"}
          message="Esta parte de la pantalla no pudo cargarse. El resto de la aplicación sigue disponible."
          onRetry={() => this.setState({ hasError: false })}
          showHomeLink={false}
        />
      )
    }

    return this.props.children
  }
}
