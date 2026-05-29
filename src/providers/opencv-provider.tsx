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
    async function load() {
      let cancelled = false;

      try {
        const { loadOpenCV } = await import("@opencvjs/web");
        const opencv = await loadOpenCV();
        console.log("loaded");
        if (cancelled) return;

        setCV(opencv);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load OpenCV.js", error);
      }

      return () => {
        cancelled = true;
      };
    }

    load();
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
