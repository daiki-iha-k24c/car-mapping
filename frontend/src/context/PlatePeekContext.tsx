import React, { createContext, useContext, useMemo, useState } from "react";
import PlatePeekModal from "../components/PlatePeekModal";
import type { Plate } from "../storage/plates";

type Ctx = {
  openPlate: (p: Plate) => void;
};

const PlatePeekContext = createContext<Ctx | null>(null);

export function PlatePeekProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState<Plate | null>(null);

  const openPlate = (p: Plate) => {
    setPlate(p);
    setOpen(true);
  };

  const value = useMemo(() => ({ openPlate }), []);

  return (
    <PlatePeekContext.Provider value={value}>
      {children}

      <PlatePeekModal
        open={open}
        plate={plate}
        onClose={() => setOpen(false)}
      />
    </PlatePeekContext.Provider>
  );
}

export function usePlatePeek() {
  const ctx = useContext(PlatePeekContext);
  if (!ctx) throw new Error("usePlatePeek must be used within PlatePeekProvider");
  return ctx;
}
