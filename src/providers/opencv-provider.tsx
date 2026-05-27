"use client";

import { loadOpenCV, type OpenCV } from "@opencvjs/web";
import { createContext, useContext, useEffect, useState } from "react";

interface OpenCVContextType {
  cv: typeof OpenCV | null;
}

const OpenCVContext = createContext<OpenCVContextType | null>(null);

export function OpenCVProvider({ children }: { children: React.ReactNode }) {
  const [cv, setCV] = useState<typeof OpenCV | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const opencv = await loadOpenCV();
        setCV(opencv);
      } catch (error) {
        console.error("Failed to load OpenCV.js", error);
      }
    }

    load();
  }, []);

  return (
    <OpenCVContext.Provider value={{ cv }}>{children}</OpenCVContext.Provider>
  );
}

export function useOpenCV() {
  const context = useContext(OpenCVContext);
  if (!context) {
    throw new Error("useOpenCV must be used within an OpenCVProvider");
  }

  return context.cv;
}
