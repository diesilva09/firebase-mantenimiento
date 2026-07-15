"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

/** Avisa al usuario cuando pierde la conexión mientras usa la plataforma. */
export function useOfflineNotice() {
  const { toast } = useToast();
  const wasOnlineRef = useRef(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => {
      wasOnlineRef.current = true;
      toast({
        title: "Conexión restaurada",
        description: "Ya puedes continuar con tus operaciones.",
        variant: "success",
      });
    };

    const handleOffline = () => {
      if (wasOnlineRef.current) {
        toast({
          title: "Sin conexión a internet",
          description:
            "Perdiste la conexión. Las operaciones no se guardarán hasta que vuelvas a estar en línea.",
          variant: "destructive",
        });
      }
      wasOnlineRef.current = false;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);
}
