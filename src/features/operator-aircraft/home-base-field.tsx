"use client";

import { useState } from "react";
import { LocationField } from "@/components/shared/location-field";

/** The home base for the plain create form: submits `homeBaseId`. */
export function HomeBaseField() {
  const [chosen, setChosen] = useState("");
  return (
    <>
      <input type="hidden" name="homeBaseId" value={chosen} />
      <LocationField
        label="Home base"
        searchLabel="Find the home base"
        value={chosen}
        onChange={setChosen}
      />
    </>
  );
}
