"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { OpenCV } from "@opencvjs/web";

type OpenCVContextType =
  | {
      cv: null;
      isLoading: true;
    }
  | {
      cv: typeof OpenCV;
      isLoading: false;
    };

const OpenCVContext = createContext<OpenCVContextType | null>(null);

export function OpenCVProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cv, setCV] = useState<typeof OpenCV | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { loadOpenCV } = await import("@opencvjs/web");
        const opencv = await loadOpenCV();
        if (cancelled) return;

        setCV(opencv);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load OpenCV.js", error);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <OpenCVContext.Provider
      value={
        {
          cv,
          isLoading,
        } as OpenCVContextType
      }
    >
      {children}
    </OpenCVContext.Provider>
  );
}

export function useOpenCV() {
  const context = useContext(OpenCVContext);
  if (!context) {
    throw new Error("useOpenCV must be used within an OpenCVProvider");
  }

  return context;
}
