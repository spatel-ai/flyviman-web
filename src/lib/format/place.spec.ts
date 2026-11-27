import { describe, expect, it } from "vitest";
import { routeLabel, shortPlaceName } from "./place";

describe("shortPlaceName", () => {
  it("drops the airport words at the end", () => {
    expect(shortPlaceName("Goa Dabolim International Airport")).toBe(
      "Goa Dabolim",
    );
    expect(shortPlaceName("Juhu Airport")).toBe("Juhu");
    expect(shortPlaceName("Pune Domestic Airport")).toBe("Pune");
  });

  it("keeps a name that has no airport words", () => {
    expect(shortPlaceName("Mumbai")).toBe("Mumbai");
  });

  it("keeps a name that is only those words", () => {
    expect(shortPlaceName("Airport")).toBe("Airport");
  });
});

describe("routeLabel", () => {
  it("joins the short names with an arrow", () => {
    expect(
      routeLabel(
        "Chhatrapati Shivaji Maharaj International Airport",
        "Goa Dabolim International Airport",
      ),
    ).toBe("Chhatrapati Shivaji Maharaj → Goa Dabolim");
  });
});
