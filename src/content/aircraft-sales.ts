/**
 * Aircraft and helicopters for sale, imported from
 * https://flyviman.com/sales-purchase/ (WordPress page 9303, modified 2026-02-18) and the
 * listing page each links to, on 2026-11-14, by
 * .claude/skills/site-content-import/scripts/import_aircraft_sales.py.
 * Do not edit by hand: change the live site and run the script again.
 *
 * The selling brokers' names and addresses are left out, and so are the
 * listing photographs. None of these is bookable or priced: each leads to
 * an enquiry (rule 4).
 */

export interface SaleListing {
  /** Address of its page here, or null when the live site has none. */
  slug: string | null;
  category: "AIRCRAFT" | "HELICOPTER";
  title: string;
  serial: string | null;
  details: readonly { label: string; value: string }[];
  sections: readonly { title: string; items: readonly string[] }[];
}

export const AIRCRAFT_SALES = {
  hero: {
    overline: "Sales & purchase",
    title: "Aircraft and helicopters for sale",
    lead: "Business jets and helicopters offered through FlyViman. Ask about any of them and our team will come back to you with the details.",
    image: "charterJetDusk",
  },
  categories: [
    { id: "AIRCRAFT", title: "Aircrafts for sale" },
    { id: "HELICOPTER", title: "Helicopters for sale" },
  ],
  action: "Enquire now",
  listings: [
    {
      slug: "gulfstream-g550",
      category: "AIRCRAFT",
      title: "Gulfstream G550",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2015",
        },
        {
          label: "Location",
          value: "United Kingdom",
        },
        {
          label: "Manufacturer",
          value: "Gulfstream Aerospace",
        },
        {
          label: "Serial Number",
          value: "5496",
        },
        {
          label: "Total Time",
          value: "5236 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Fully enrolled on Programs",
            "Enhanced Navigation",
            "Swift Broadband",
            "14 Passengers and Forward Galley",
          ],
        },
        {
          title: "Airframe",
          items: [
            "TTSN: 5,236",
            "TLSN: 1,839",
            "Program Coverage: JSSI",
            "100%",
          ],
        },
        {
          title: "Engine(s)",
          items: [
            "Rolls-Royce BR700-710C4-11",
            "TTSN: 5,236 / 5,236",
            "TCSN: 1,839 / 1,839",
            "Engine SN1: 16115",
            "Engine SN2: 16116",
            "On Engine Program: Rolls-Royce Corporate",
            "Care Enhanced",
          ],
        },
        {
          title: "APU Details",
          items: [
            "Honeywell RE220",
            "TTSN: 896",
            "SN: P-830",
            "On APU Program: JSSI",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "ASC-061B – Synthetic Vision",
            "ASC-065A – Runway Awareness Advisory System",
            "ASC-084B – Enhanced Navigation",
            "ASC-105A – ADS-B Out",
            "ASC-123A – Plane View Avionics Enhancement",
            "ASC-912C – Plane View Master Operating System",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Number of Passengers: Fourteen (14)",
            "Galley Location: Forward",
            "Forward Cabin Configuration: Four (4) Place Club",
            "Mid Cabin Configuration: Four (4) Place Conference Group opposite a Credenza",
            "Aft Cabin Configuration: Two (2) Place Club opposite Four (4) Place Divan",
            "Lavatory Location(s): Forward and Aft",
            "Crew Rest: Yes",
            "Jumpseat: Yes",
            "Galley Equipment: Microwave Oven; Hi-Temp Oven; Coffee Maker",
            "Display / TV Monitor(s): Two (2) Bulkhead Monitors; One (1) Monitor Over Credenza",
            "Cabin Management System: Gulfstream",
            "Internet: SwiftBroadband",
          ],
        },
        {
          title: "Exterior Details",
          items: [
            "Base Paint Color(s): Matterhorn",
            "Stripe Color(s): Light Blue and Blue",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "Maintenance Tracking: CMP",
            "12M Inspection / September 2025 / August 2026",
            "48M Inspection / April 2023 / April 2027",
            "96M Inspection / April 2023 / April 2031",
            "144M Inspection / - / April 2027",
          ],
        },
      ],
    },
    {
      slug: "gulfstream-g200",
      category: "AIRCRAFT",
      title: "Gulfstream G200",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2011",
        },
        {
          label: "Location",
          value: "Germany",
        },
        {
          label: "Manufacturer",
          value: "Gulfstream Aerospace",
        },
        {
          label: "Serial Number",
          value: "238",
        },
        {
          label: "Registration No",
          value: "OK-GLX",
        },
        {
          label: "Total Time",
          value: "6996 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Airframe",
          items: ["TTSN: 6,996:54", "TCSN: 4,011"],
        },
        {
          title: "Engine(s)",
          items: [
            "Pratt & Whitney Canada Corp. P306A",
            "TTSN: 6,497:51 / 6,462:12",
            "TCSN: 3,651 / 3,620",
            "Engine SN1: PCE-CC0495",
            "Engine SN2: PCE-CC00494",
            "On Engine Program: ESP Gold",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "Maintenance tracking: Traxxall",
            "Inspection / Last Performed / Next Due",
            "12 Month Inspection / January 2026 / December 2026",
            "24 Month Inspection / December 2024 / November 2026",
            "36 Month Inspection / January 2026 / December 2028",
            "48 Month Inspection / December 2022 / November 2026",
            "96 Month Inspection / November 2018 / November 2026",
            "144 Month Inspection / December 2022 / December 2034",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Number of passengers: 10 Passenger configuration",
            "Galley Forward: Galley including Microwave Oven & Coffeemaker",
            "Forward cabin configuration: Four (4) place club seating with fold-out tables",
            "Cabin configuration: 4-Place conference group with a dining table, Opposite 2-Place divan",
            "Lavatory location: Aft",
            "Jump Seat: Yes",
            "Forward Cabin 15’’ LH Bulkhead LCD Monitor",
            "Aft Cabin 17’’ RH Bulkhead LCD Monitor",
            "Dual Multi-Region DVD Player",
            "RosenView LX Passenger Flight Information System",
            "Telephone System: ICG ICS-200 Iridium Dual Channel SATCOM",
          ],
        },
        {
          title: "Exterior Details",
          items: [
            "Base paint color(s): Matterhorn White Stripe color(s): Accent Gold Last painted: Since New",
          ],
        },
        {
          title: "APU Details",
          items: [
            "Honeywell Aerospace GTCP-36-150",
            "TTSN: 5,447",
            "TCSN: 6,365",
            "SN: P-345",
          ],
        },
      ],
    },
    {
      slug: "2023-airbus-h130",
      category: "HELICOPTER",
      title: "2023 Airbus H130",
      serial: "8450",
      details: [
        {
          label: "Year",
          value: "2023",
        },
        {
          label: "Location",
          value: "Ontario (Canada)",
        },
        {
          label: "Manufacturer",
          value: "Airbus Helicopters",
        },
        {
          label: "Serial Number",
          value: "8450",
        },
        {
          label: "Registration No",
          value: "C-FKUR",
        },
        {
          label: "Total Time",
          value: "55 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Airframe",
          items: ["TTSN: 55"],
        },
        {
          title: "Engine(s)",
          items: [
            "Arriel 2D",
            "TTSN: 55",
            "Dual-Channel Digital Engine Control System (FADEC)",
            "On Engine Program: No",
          ],
        },
        {
          title: "Maintenance Status",
          items: ["Fresh 24 Month/600 Hour Inspection - August 2025"],
        },
        {
          title: "Exterior Details",
          items: ["Green and White with Green Accent Striping"],
        },
        {
          title: "Interior Details",
          items: [
            "Seven Passenger Seating Configuration - Pilot + 2 Pax Front / 4 Pax Rear",
            "Adjustable Pilot High-back Energy Absorbing Seat",
            "Six Passenger High-back Energy Absorbing Seats",
            "Optional Eight Passenger Provisions",
            "Carpeted Light Alloy Sheet Metal Cabin Floor",
            "Two Cockpit Jettisonable Hinged Doors",
            "LH Front Door with Sliding Window",
            "RH Front Door Compatible with 8 Seat Layout",
            "LH and RH Rear Sliding Doors",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Dual Controls",
            "Dual Hydraulics",
            "Anti-Vabration Control System",
            "200A, 28 VDC Starer-Generator",
            "Lock-On Fuel Cap",
            "Lateral & Upper Tinted Windows",
            "Demisting System For Front Windows",
            "Two Pilot Document Holders",
            "Door Map Case - LH & RH Doors",
            "Doors & Baggage Compartment Locks",
            "Magnetic Plug and Chip Detector",
            "Crashworthy Fuel System (143 Gallons)",
            "Two Hydraulic Ground Handling Bogies",
            "28V OC Cabin Power Outlet",
            "15 A.H Cadmium-Nickel Battery",
            "Ground Power Receptacle",
            "3 Position Lights (LED)",
            "Flashing Anti Collission Lights (LED)",
            "Dual Fixed Landing Lights",
            "Pitot Head Cover",
            "Static Port Stoppers",
            "Air Intake Protection Grids",
            "Engine Air Intake Blanking Cover",
            "Fire Detection System",
            "Fire Extinguisher",
            "Flight Manual",
            "Cabin Lighting & 7 Air Ventilation Outlets w/ Controls",
            "Two Cabin Light Sets each with Two Reading Lights for Rear Passengers and Dome Light",
            "Factory Installed Emergency Pop-out Floats",
            "Aerometals FDC Inlet Barrier Kit Installation",
          ],
        },
      ],
    },
    {
      slug: "1987-bell-222b",
      category: "HELICOPTER",
      title: "1987 Bell 222B",
      serial: "47151",
      details: [
        {
          label: "Year",
          value: "1987",
        },
        {
          label: "Location",
          value: "Georgia (USA)",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "47151",
        },
        {
          label: "Registration No",
          value: "N322AW",
        },
        {
          label: "Total Time",
          value: "0 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Airframe",
          items: [
            "1,600 TTSN",
            "M/R Blades - 4,520 Hours Remaining",
            "T/R Blades - 4,581 Hours Remaining",
            "T/R Gearbox - 4,460 Hours Remaining",
          ],
        },
        {
          title: "Engine(s)",
          items: [
            "Engine 1 - Honeywell LTS 101-750-C-1",
            "2,400 Hour TBO",
            "1,482 TTSN",
            "Gas Generator",
            "917 Hours Remaining to Overhaul",
            "Power Turbine",
            "917 Hours Remaining to Overhaul",
            "Accessory Gearbox",
            "1,612 Hours Remaining to Overhaul",
            "Fuel Control",
            "2,212 Hours Remaining to Overhaul",
            "Engine 2 - Honeywell LTS 101-750-C-1",
            "2,400 Hour TBO",
            "1,409 TTSN",
            "Gas Generator",
            "2,214 Hours Remaining to Overhaul",
            "Power Turbine",
            "1,441 Hours Remaining to Overhaul",
            "Accessory Gearbox",
            "1,614 Hours Remaining to Overhaul",
            "Fuel Control",
            "937 Hours Remaining to Overhaul",
            "On Engine Program: NO",
          ],
        },
        {
          title: "Maintenance Status",
          items: ["Fresh 24 Month/600 Hour Inspection - August 2025"],
        },
        {
          title: "Interior Details",
          items: [
            "Tan Leather Executive Seating",
            "Pilot & Co-Pilot Seating",
            "Three Forward Facing Rear Seats",
            "Three Aft Facing Mid Row Seats",
            "Black and Tan Side Panels",
            "Black Carpet",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Dual Pilot IFR capable",
            "Executive 8 Passenger Helicopter",
            "Turnkey Business for any charter operation or luxury private helicopter. Ready for Part 135 Inspection",
            "Beautifully restored in 2024 with new paint, upholstery, avionics, plumbing, hydraulic lines & new starter generator",
            "Fully disassembled and inspected Transmission and Gearbox in 2024",
            "Flown over 100 hours in the last 6 months",
            "100% airworthy Airwolf with plenty of time remaining on all major components",
            "Parts and maintenance available with Helicopter Solutions NC",
          ],
        },
        {
          title: "Exterior Details",
          items: ["Black with Gold Accent Stripe"],
        },
      ],
    },
    {
      slug: "1987-as350sd1",
      category: "HELICOPTER",
      title: "1987 AS350 SD1",
      serial: null,
      details: [
        {
          label: "Year",
          value: "1987",
        },
        {
          label: "Location",
          value: "New Zealand",
        },
        {
          label: "Manufacturer",
          value: "Eurocopter",
        },
        {
          label: "Total Time",
          value: "6250 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Dual Sliding Doors",
            "Cargo Hook & Mirror",
            "Vertical Ref Window",
            "WSPS",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 6,250"],
        },
        {
          title: "Engine(s)",
          items: [
            "Honeywell LTS101 600A3A",
            "H.S.I. (1800 HOURS): 1,718 Remaining",
            "FCU: 1,392 Remaining",
            "On Engine Program: No",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "Component Times:",
            "MGB: 1,309 Remaining",
            "MRB: 15,093 Remaining",
            "TRB: 1,255 Remaining",
            "Starflex: 684 Remaining",
            "12 Year Airframe Insp: Due Oct 2035",
          ],
        },
        {
          title: "Interior Details",
          items: ["Configuration: Passenger / Utility"],
        },
        {
          title: "Features & Options",
          items: [
            "FDC Filter",
            "Dual Sliding Doors",
            "Onboard Cargo Hook & Dart Mirror",
            "Pilot Seat Shift Kit",
            "WSPS",
            "Bleed Air",
            "Vert Ref Window",
          ],
        },
        {
          title: "Exterior Details",
          items: ["Burnt Orange & Metallic Grey"],
        },
      ],
    },
    {
      slug: "bell407gx",
      category: "HELICOPTER",
      title: "Bell 407 GX",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2015",
        },
        {
          label: "Location",
          value: "Alaska (USA)",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "54575",
        },
        {
          label: "Registration No",
          value: "N34TP",
        },
        {
          label: "Total Time",
          value: "2047 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Airframe",
          items: ["TT: 2,047"],
        },
        {
          title: "Engine(s)",
          items: [
            "Done on 2021",
            "Configuration/PAX: VIP/7 Passengers",
            "Air Conditioning: Air COMM Freon",
            "Headliner: Headliner w/AC Ducting",
            "Accessories: Shoulder Harnesses",
            "Red Interior",
          ],
        },
        {
          title: "Interior Details",
          items: ["250-C47B/8", "SN: CAE-848754", "TTSN: 1,930", "TCSN: 2,439"],
        },
        {
          title: "Exterior Details",
          items: ["Red and Black"],
        },
        {
          title: "Maintenance Status",
          items: [
            "Damage History: No Aux Fuel Left and Right Hand PIC Helicopter was Previously DOI Carded and Meets MATOC Requirements",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Cockpit: ADS-B Out, Garmin Helicopter Synthetic Vision Technology, Artex C406-NHM ELT, Garmin GDC-74H Air Data Computer, Garmin GMH-350H Audio Panel, Dual Controls",
            "Equipment: Wire Strike Kit, 29-amp/Hour Battery, Baggage Floor Protector, Folding Maintenance Steps, Rotor Brake, Low Skid Gear, Heater/demist, Engine Inlet Barrier Filter, Tail Rotor Camera, Soundproofing, Door Openers, Air Conditioning w/Dual Evaporators, Pre-flight Step/Handle Kit, Aft Avionics Shelf, Float Gear, Standard Gear and Left Hand Bubble & Standard Door.",
            "Lights: LED",
            "Flight Data Recorder",
            "Terrain Awareness & Warning System",
            "Weather Radar",
            "Emergency Locator Transmitter",
            "Synthetic Vision System/Technology",
            "Traffic Collision Avoidance System",
            "ADS-B Capable",
          ],
        },
      ],
    },
    {
      slug: "2021airbus-h125",
      category: "HELICOPTER",
      title: "2021 Airbus H125",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2021",
        },
        {
          label: "Manufacturer",
          value: "Airbus Helicopters",
        },
        {
          label: "Total Time",
          value: "1250 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Aircraft is offered subject to verification upon inspection and withdrawal from the market or prior sale. Images are for illustration purposes only and may not be an exact representation of the actual aircraft.",
          ],
        },
      ],
    },
    {
      slug: "2025airbus-h130",
      category: "HELICOPTER",
      title: "2025 Airbus H130",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2025",
        },
        {
          label: "Manufacturer",
          value: "Airbus Helicopters",
        },
        {
          label: "Total Time",
          value: "0 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [],
    },
    {
      slug: "2007grand-a109s",
      category: "HELICOPTER",
      title: "2007 Grand A109S",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2007",
        },
        {
          label: "Manufacturer",
          value: "Agusta Helicopter",
        },
        {
          label: "Total Time",
          value: "0 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [],
    },
    {
      slug: "2025airbus-ach130",
      category: "HELICOPTER",
      title: "2025 Airbus ACH130",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2025",
        },
        {
          label: "Manufacturer",
          value: "Airbus Helicopters",
        },
        {
          label: "Total Time",
          value: "0 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "ACH Line Layout (7 Seats)",
            "Enhanced Air Conditioning System",
            "Emergency Floats",
          ],
        },
      ],
    },
    {
      slug: "2025-airbus-h125",
      category: "HELICOPTER",
      title: "2025 Airbus H125",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2025",
        },
        {
          label: "Manufacturer",
          value: "Airbus Helicopters",
        },
        {
          label: "Total Time",
          value: "0 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: ["Several brand new H125 - Available for sale"],
        },
      ],
    },
    {
      slug: "2001eurocopter-ec120b",
      category: "HELICOPTER",
      title: "2001 Eurocopter EC120B",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2001",
        },
        {
          label: "Location",
          value: "Tennessee (USA)",
        },
        {
          label: "Manufacturer",
          value: "Eurocopter",
        },
        {
          label: "Serial Number",
          value: "1195",
        },
        {
          label: "Registration No",
          value: "N88EC",
        },
        {
          label: "Total Time",
          value: "3152 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Head turning aircraft inside and out. Frequent flyer and professionally managed.",
          ],
        },
        {
          title: "Airframe",
          items: ["TTSN: 3,152"],
        },
        {
          title: "Engine(s)",
          items: [
            "Arrius 2F",
            "TTSN: 3,152",
            "Engine SN1: 34204",
            "On Engine Program: No",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "12 Month completed 08/25",
            "15, 30 and 100 hour completed 08/25",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "1 Crew 4 Passenger VIP Configuration",
            "Two Forward Facing Front Seats",
            "Three Forward Facing Aft Seats",
            "Brown and Black Diamond Stitched Leather Seating",
          ],
        },
        {
          title: "Features & Options",
          items: ["ADS-B In/Out", "Steerable Landing Light"],
        },
        {
          title: "Exterior Details",
          items: ["Custom Paint Scheme in Black, Tan and Orange Stripes"],
        },
      ],
    },
    {
      slug: "1968bell204b",
      category: "HELICOPTER",
      title: "1968 Bell 204B",
      serial: null,
      details: [
        {
          label: "Year",
          value: "1968",
        },
        {
          label: "Location",
          value: "South Africa",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "AB204B x 4",
        },
        {
          label: "Registration No",
          value: "Various",
        },
        {
          label: "Total Time",
          value: "2500 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "I have a package of 4 x August Bell 204B helicopters for sale as a spares package or for rebuild, they have been out of service for some years and one is accident damaged, the other 3 were flying on firefighting contract before taken out of service, they are standing in Swaziland and can be packed and shipped to any destination, any reasonable offer will be considered, serial numbers are 3048, 3063, 3093 and 3149, two have the RR Gnome Engine and the two have the General Electric (GE) engines.",
          ],
        },
      ],
    },
    {
      slug: "2012bell429",
      category: "HELICOPTER",
      title: "2012 Bell 429",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2012",
        },
        {
          label: "Location",
          value: "Czech Republic",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "57087",
        },
        {
          label: "Registration No",
          value: "OM-TIP",
        },
        {
          label: "Total Time",
          value: "1922 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Great Pedigree",
            "Fresh from Annual Inspection",
            "One Owner/Operator Since New",
            "ESP Gold Engine Program",
          ],
        },
        {
          title: "Airframe",
          items: ["TTSN: 1,922:42", "TLSN: 5,455"],
        },
        {
          title: "Engine(s)",
          items: [
            "Pratt & Whitney Canada Corp. PW207D1",
            "SN: PCE-BL0177 / PCE-BL0178",
            "TTSN: 1,922:42 / 1,922:42",
            "TCSN: 3,325 / 3,325",
            "Engines Program ESP Gold",
          ],
        },
        {
          title: "Exterior Details",
          items: [
            "Base paint color(s): Metallic Blue",
            "Stripe color(s): White",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "Inspection / Last Performed / Next Due",
            "200H/12M Inspection / 1,919.1H / August 2025 / 2,119.1H / August 2026",
            "600H/12M Inspection / 1,919.1H / August 2025 / 2,519.1H / August 2026",
            "800H/12M Inspection / 1,919.1H / August 2025 / 2,719.1H / August 2026",
            "800H/24M Inspection / 1,919.1H / August 2025 / 2,719.1H / August 2027",
            "2-Year Inspection / August 2025 / August 2027",
            "3-Year Inspection / August 2023 / August 2026",
            "4-Year Inspection / December 2023 / December 2027",
            "5-Year Inspection / August 2021 / August 2026",
            "6-Year Inspection / August 2023 / August 2029",
            "7-Year Inspection / August 2024 / August 2031",
            "8-Year Inspection / November 2019 / November 2027",
            "10-Year Inspection / August 2021 / August 2031",
            "12-Year Inspection / December 2023 / December 2035",
            "NO.1 Engine – Turbomachine Module / - / 4,000",
            "NO.2 Engine – Turbomachine Module / - / 4,000",
            "NO.1 Engine – Reduction Gearbox Module / - / 4,000",
            "NO.2 Engine – Reduction Gearbox Module / - / 4,000",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Number of passengers: 5 (+1) Corporate passenger configuration",
            "Colour scheme: Two-tone beige & black leather",
            "Cabin configuration: Two (2) 21.5’’ forward facing VIP seats separated by a center console, Three (3) aft facing 18.5’’facing seats",
            "Cabin equipment: Molded thermoplastic corporate headliner with LED lights, adjustable air vents & leather trim, Cabin soundproofing, Aft Cabin ICS – 6 Place",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "AFCS (3-axis) Dual Digital Autopilot",
            "Dual Channel SCAS and Trim Actuators",
            "Course/Heading/Flight Director Panel",
            "Standby Instruments (Attitude, Altitude, Heading and Airspeed)",
            "Electronic Data Recorder (non-crashworthy)",
            "Dual Keyed and/or VOX Intercom System",
            "Automatic Crew and PAX Door Openers",
            "Cabin Heating System",
            "Cabin Air Conditioning System",
            "Tail Rotor Protection System",
            "Wirestrike Protection System Provisions",
            "Inlet Barrier Filter",
            "Electrical Provisions Kit",
            "Dual Pilot Controls Equipment",
            "Rotor Brake Equipment",
            "Articulated Landing Lights",
            "Dual 200 Amp Starter Generator",
            "Increased Capacity Battery (53 Amph)",
            "Compressor Wash Kit",
            "Windshield Wipers (Pilot & Co-Pilot)",
            "Pilot Cyclic Stick Locking Device",
            "Corporate Headliner with Led Lights & Adjustable Air Conditioning Vents",
            "Cabin Soundproofing",
            "Auxiliary Fuel Tank Equipment (39 US Gal.)",
            "Aft Cabin ICS – 6 Place",
            "Aft Bulkhead Closeout Panel with Soundproofing",
            "Corporate Interior",
          ],
        },
      ],
    },
    {
      slug: "2022-505-jet-ranger-x",
      category: "HELICOPTER",
      title: "2022 505 Jet Ranger X",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2022",
        },
        {
          label: "Location",
          value: "Florida (USA)",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "65458",
        },
        {
          label: "Registration No",
          value: "N505N",
        },
        {
          label: "Total Time",
          value: "43 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "This 2022 Bell 505 is like new and ready to fly. It’s the world’s most advanced single-engine turbine helicopter, built for speed, smooth handling, and confidence. A modern flight deck makes flying easy, while the proven rotor and drivetrain deliver reliability. The spacious cabin offers excellent legroom and comfort at a competitive operating cost.",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 43"],
        },
        {
          title: "Engine(s)",
          items: [
            "Safran Arrius 2R Turboshaft",
            "SN: 54326",
            "Engine Total Time: 43 SNEW",
            "On Engine Program: N/A",
          ],
        },
        {
          title: "Maintenance Status",
          items: ["100 Hr Inspection: August 29, 2025"],
        },
        {
          title: "Exterior Details",
          items: ["The aircraft is black with a silver tail number."],
        },
        {
          title: "Interior Details",
          items: [
            "The interior of the aircraft is mostly black. It features ergonomically designed crew seats with double strap shoulder harnesses for safety, while the passenger seats are done in black fabric and have four point restraint harnesses",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "18 cubic foot baggage compartment",
            "Incidents: None",
            "Known Flaws: None",
            "Known Corrosion: None",
          ],
        },
      ],
    },
    {
      slug: "2026agusta-aw139",
      category: "HELICOPTER",
      title: "2026 Agusta AW139",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2026",
        },
        {
          label: "Location",
          value: "Hong Kong",
        },
        {
          label: "Manufacturer",
          value: "Agusta Helicopter",
        },
        {
          label: "Serial Number",
          value: "32145",
        },
        {
          label: "Total Time",
          value: "0 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Factory-New 2026 Leonardo AW139 – Delivery Hours Only",
            "High Specification 12-Passenger Offshore Configuration",
            "Increased Gross Weight to 7,000 kg with 300 kg baggage load",
            "Auxiliary Fuel Tank",
            "Honeywell Primus Epic Phase 8 Avionics Suite Upgrade",
            "4-Axis Dual Digital Automatic Flight Control System (DAFCS)",
            "ADS-B Out, Dual GPS, Dual Radar Altimeters,",
            "Enhanced Ground Proximity Warning System (EGPWS), TCAS II",
            "Health & Usage Monitoring System (HUMS) and Helicopter Operations Monitoring Program (HOMP)",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: Delivery Hours"],
        },
        {
          title: "Engine(s)",
          items: [
            "Pratt & Whitney Canada PT6C-67C",
            "Dual Independent FADEC Systems",
            "Status: Delivery Hours",
            "On Engine Program: No",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Cockpit Configuration",
            "Dual Adjustable Leather Pilot Seats",
            "Windshield Washing System",
            "Approach Plate / Chart Holders with Lights",
            "Co-Pilot Hinged Window (Storm Window)",
            "Cabin Configuration",
            "12 Lightweight Crashworthy Passenger Seats",
            "Lightweight Rigid Liner Cabin with Polycarbonate Liners with Lightweight Soundproofing",
            "Passenger Address (PA) System with Loudspeakers via ICS",
            "Air Conditioning System",
            "Cabin ICS Panel with Headset Plug",
            "Emergency Exit Signs and Lighting",
            "Synthetic Rubber Floor Carpet",
            "Cockpit Map and Data Case",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Lipstick Camera AIRS 400-Camera System",
            "High Intensity Strobe Lights",
            "SmartView System (SVS)",
            "Offshore Custom Approach",
            "ADS-B Out",
            "CVR/FDR with ULB",
            "Emergency Exit Lighting System (HEELS)",
            "Tail Fin Camera",
            "Dual Underbelly Cameras",
            "Integrated Life Rafts and Floats System (DART)",
            "Winglets Strobe Lights",
            "Transversal Auxiliary Fuel Tank (400 kg / 132 US gal)",
            "Low-Speed Gear Aural Warning",
            "Rotor Brake",
            "Increased Gross Weight – 7,000 kg with 300 kg baggage capacity",
          ],
        },
        {
          title: "Exterior Details",
          items: [
            "Custom OEM Paint Scheme",
            "Matterhorn White with Pearl Gray, Light Blue and Dark Blue Accents",
            "Maritime Protection Coating",
          ],
        },
      ],
    },
    {
      slug: null,
      category: "HELICOPTER",
      title: "2015 Airbus H125",
      serial: null,
      details: [],
      sections: [],
    },
    {
      slug: "2006-agusta-aw139",
      category: "HELICOPTER",
      title: "2006 Agusta AW139",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2006",
        },
        {
          label: "Location",
          value: "Argentina",
        },
        {
          label: "Manufacturer",
          value: "Agusta Helicopter",
        },
        {
          label: "Serial Number",
          value: "31038",
        },
        {
          label: "Registration No",
          value: "LV-KJB",
        },
        {
          label: "Total Time",
          value: "1620 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "VIP 6 Passenger Interior",
            "Extremely Low Total Time (1650)",
            "Increased Gross Weight (6,800 Kg)",
            "Air Conditioning",
            "Auxiliary Fuel Tank",
            "Equipped with CVR, EGPWS, TCAS 1",
            "No Damage History / Complete Records",
            "Previously N & C Registered",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 1,620.8", "Cycles: 3,705"],
        },
        {
          title: "Engine(s)",
          items: [
            "Pratt & Whitney PT6C-67C",
            "SN: PCE-KB0089 / PCE-KB0092",
            "TT: 1,620.8 / 1,620.8",
            "Cycles: 3,705 / 3,705",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Passenger seats: VIP - Six Pax + Two Crew",
            "Refreshment center: Coffee, ice cooler",
            "Cabin features: Two single seats opposite four seats. Finished in two tone navy and beige leather. Gold plated hardware.",
            "Particular Features: Last refurbished 2012 - Flying Colors Peterborough",
          ],
        },
        {
          title: "Exterior Details",
          items: [
            "Exterior base White",
            "Additional Navy and gold accent stripes Last paint 2014",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "EGPWS",
            "TCAS I Bendix King",
            "Long Range Fuel Tank",
            "MTOW 6,800 KG",
            "Cockpit Voice & Data Recorder",
            "Co-pilot Storm Window",
            "Approach Plates Chart Holders Lighted for both pilot/copilot",
            "Autopilot 4 Axis",
            "Weather Search Radar “Primus 701” (Kit)",
            "17” Flat Screen",
            "9” Flat Screen",
            "Aft Cabin Skylight Devore Lighting Electric Limo Window",
            "Additional strobe light",
            "Additional Transponder XS-856A, Honeywell",
            "Air Conditioning System w/ separate cabin control switch in cockpit",
            "Emergency Floats (provisions)",
            "Emergency Floats (removable parts)",
            "Engine Particle Separator",
            "Five-point restraint Harness for Pilot and Co-pilot",
            "Heated Windshield",
            "High visibility main rotor blades",
            "Moving Map “SEGEM”",
            "PA System (on std. ICS)",
            "RH/LH Electrically Operated Pax Steps (in lieu of fixed steps)",
            "Tinted Window - Cabin",
          ],
        },
      ],
    },
    {
      slug: "1977jetranger206b-3",
      category: "HELICOPTER",
      title: "1977 Jetranger 206B-3",
      serial: null,
      details: [
        {
          label: "Year",
          value: "1977",
        },
        {
          label: "Location",
          value: "Mississippi (USA)",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "2147",
        },
        {
          label: "Registration No",
          value: "N16770",
        },
        {
          label: "Total Time",
          value: "15312 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Excellent component times remaining on this well-equipped Jet Ranger.",
          ],
        },
        {
          title: "Airframe",
          items: ["TTSN: 15,312"],
        },
        {
          title: "Engine(s)",
          items: [
            "Rolls Royce 250-C20B",
            "TBO: 3,500",
            "Stage 1 and 2 Wheels: 990 Hrs Remaining",
            "Stage 3 and 4 Wheels: 3,765 Hrs Remaining",
            "Turbine Assembly: 2,715 Hrs Remaining",
            "Engine SN1: CAE-831713",
            "On Engine Program: No",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "1 Crew 4 Passenger",
            "Two Forward Facing Front Seats",
            "Three Forward Facing Aft Seats",
            "Gray Cloth Seating",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Wire Strike Kit",
            "Range Extender",
            "Hook Provisions",
            "ELT",
            "High Skids w/ Flight Steps",
            "Rotor Brake",
            "Dual Controls",
            "Dart Avionics Console",
            "Pre-Flight Steps",
            "Multi Function Cyclic",
          ],
        },
        {
          title: "Exterior Details",
          items: ["White and Blue with Silver Stripes"],
        },
      ],
    },
    {
      slug: "2016-robinson-r66",
      category: "HELICOPTER",
      title: "2016 Robinson R66",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2016",
        },
        {
          label: "Location",
          value: "Tennessee (USA)",
        },
        {
          label: "Manufacturer",
          value: "Robinson",
        },
        {
          label: "Serial Number",
          value: "0697",
        },
        {
          label: "Registration No",
          value: "N152KB",
        },
        {
          label: "Total Time",
          value: "1008 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Well maintained R66 with new 15-year main rotor blades and new tail rotor blades last year. New style skids with steps.",
          ],
        },
        {
          title: "Airframe",
          items: ["TTSN: 1,008"],
        },
        {
          title: "Engine(s)",
          items: ["Rolls Royce 250-C300/A1", "2,000 Hour TBO", "TTSN: 1,008"],
        },
        {
          title: "Interior Details",
          items: [
            "1 Crew 3 Passengers",
            "2 Forward Facing Front Seats",
            "3 Forward Facing Aft Seats",
            "Tan Leather Seating",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Air Conditioning",
            "ADSB In and Out",
            "Genesys HeliSAS Autopilot",
            "Ground Handling Wheels",
            "New Style Skids with Step",
          ],
        },
        {
          title: "Exterior Details",
          items: ["Maroon w/Gold Stipes"],
        },
      ],
    },
    {
      slug: "2018-agusta-aw119kx",
      category: "HELICOPTER",
      title: "2018 Agusta AW119 Kx",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2018",
        },
        {
          label: "Manufacturer",
          value: "Agusta Helicopter",
        },
        {
          label: "Serial Number",
          value: "14955",
        },
        {
          label: "Total Time",
          value: "198 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "This helicopter offers exceptional performance, advanced avionics, and reliability for a wide range of missions.",
            "This helicopter stands out in the market with:",
            "Low Time Aircraft",
            "Re-Painted in 2025",
            "Flight Management System",
            "HEMS Kit w/ Stretchers & Oxygen Bottles",
            "6-Pax VIP & Medical Interchangeable Configuration",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 198.8", "Landings: 485"],
        },
        {
          title: "Engine(s)",
          items: [
            "PT6B-37A",
            "TT: 198.8",
            "Cycles: 485",
            "TBO: 3,000",
            "Engine SN1: 3041345",
            "On Engine Program: No",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Configuration: VIP & Medical",
            "Six (6) Passengers",
            "Three (3) Forward-Facing Seats",
            "Three (3) Aft-Facing Seats",
            "Air Conditioning System",
            "Heating System",
            "HEMS Kit w/ Stretchers & Oxygen Bottles",
            "Colors: White & Beige",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Rotor Brake",
            "Dual Hydraulic System",
            "Aux Fuel Tank | Locking Fuel Cap",
          ],
        },
        {
          title: "Exterior Details",
          items: [
            "Base Paint: Gold",
            "Accent Color: Khaki",
            "Condition: Re-Painted 2025",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "Inspection / Complied With / Next Due",
            "Airframe 50FH/3M / 25-Nov-25 / 24-Jan-26",
            "Airframe 100FH/6M / 25-Jun-25 / 22-Dec-25",
            "Airframe 200FH/12M / 03-Jan-25 / 03-Jan-26",
            "Airframe 400FH/12M / 03-Jan-25 / 03-Jan-26",
            "Engine 300FH/12M / 03-Jan-25 / 03-Jan-26 or 424.4HR",
            "Engine 400FH/12M / 03-Jan-25 / 03-Jan-26 or 524.4HR",
            "Engine 400FH/24M / 03-Jan-25 / 03-Jan-26 or 924.4HR",
          ],
        },
      ],
    },
    {
      slug: "2015-robinson-r44",
      category: "HELICOPTER",
      title: "2015 Robinson R44",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2015",
        },
        {
          label: "Location",
          value: "Ontario (Canada)",
        },
        {
          label: "Manufacturer",
          value: "Robinson",
        },
        {
          label: "Serial Number",
          value: "13781",
        },
        {
          label: "Registration No",
          value: "C-GKNP",
        },
        {
          label: "Total Time",
          value: "1061 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Airframe",
          items: ["TTSN: 1,061.8"],
        },
        {
          title: "Engine(s)",
          items: [
            "Lycoming IO-540-AE1A5",
            "TTSN: 1,061.8",
            "Engine SN1: L-35970-48E",
            "On Engine Program: No",
          ],
        },
        {
          title: "Features & Options",
          items: ["Concorde Battery"],
        },
        {
          title: "Maintenance Status",
          items: [
            "Component / TBO / Current Time",
            "MR Gearbox / 2,200 / 1,061.8",
            "MR Blade / 2,200/12 Years / 1,061.8",
            "MR Blade / 2,200/12 Years / 1,061.8",
            "Swashplate Assy / 2,200 / 1,061.8",
            "Frame Assy / 2,200 / 1,061.8",
            "TR Gearbox / 2,200 / 1,061.8",
            "Tailcone Assy / 4,400 / 1,061.8",
            "TR Blade / 2,200/12 Years / 0",
            "TR Blade / 2,200/12 Years / 0",
            "TR Hub Assy / 2,200 / 1,061.8",
            "TR Pitch Control / 2,200 / 1,061.8",
            "Horizontal Stabilizer / 4,400 / 1,061.8",
            "Actuator / 2,200 / 1,061.8",
            "MR Gearset / 2,200 / 1,061.8",
            "MR Hub / 2,200 / 1,061.8",
            "Hydraulic Servo Assy / 2,200 / 1,061.8",
            "Hydraulic Pump Assy / 2,200 / 1,061.8",
            "LH Float / Annual / Nov-25",
            "RH Float / Annual / Nov-25",
            "Float Cyl Assy / 3 Year Insp/15 Year Life / OH Exchange Nov 2025",
          ],
        },
      ],
    },
    {
      slug: "1997-bell-407",
      category: "HELICOPTER",
      title: "1997 Bell 407",
      serial: null,
      details: [
        {
          label: "Year",
          value: "1997",
        },
        {
          label: "Location",
          value: "Papua New Guinea",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "53230",
        },
        {
          label: "Total Time",
          value: "0 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: ["Utility configured helicopter available for sale"],
        },
        {
          title: "Features & Options",
          items: [
            "Cargo hook with loadcell",
            "Jungle survival kit",
            "Concorde battery",
            "Sliding windows",
            "Folding maintenance step",
            "Baggage door retention strap",
            "Apical float with raft",
            "Avionics slant console",
            "First aid kit",
            "Cargo mirror",
            "Hydraulic door openers",
            "Inlet barrier filter",
            "Quick-release door pin",
            "Preflight step",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Utility configuration",
            "Six (6) passenger seats",
            "Cabin floor protectors",
            "Litter kit provisions",
            "Cabin floor protectors",
          ],
        },
      ],
    },
    {
      slug: null,
      category: "HELICOPTER",
      title: "2009 Bell 407",
      serial: null,
      details: [],
      sections: [],
    },
    {
      slug: "2016-agusta-aw169",
      category: "HELICOPTER",
      title: "2016 Agusta AW169",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2016",
        },
        {
          label: "Manufacturer",
          value: "Agusta Helicopter",
        },
        {
          label: "Total Time",
          value: "2871 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Retractable Landing Gear",
            "O&G Config",
            "Airframe and Engine PBH Included",
            "Avionics Phase 8",
            "Air Conditioning",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 2,871", "Landings: 4,650"],
        },
        {
          title: "Engine(s)",
          items: [
            "Engine 1:",
            "Engine Type Pratt & Whitney PW210A",
            "Time Since New: 2,562H",
            "Time Remaining: 1,438",
            "Engine 2:",
            "Engine Type Pratt & Whitney PW210A",
            "Time Since New: 2,856H",
            "Time Remaining: 1,144H",
            "On Engine Program: No",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Configuration: Oil & Gas",
            "Seats: 1 or 2 Pilots with 8 to 10 Passengers",
            "Overall Length: 14.645 M",
            "Overall Height: 4.50 M",
            "Rotor Diameter: 12.12 M",
            "Gross Weight: 2,850 KG",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "48M Inspection",
            "24M Inspection",
            "12M Inspection",
            "3,200HR/48M Inspection",
            "1,600HR/48M Inspection",
            "Several Component Replacements and Defect Rectification on Top",
            "Main Gearbox 0hrs Since Overhaul",
            "Phase 8 Avionics Software Installed",
            "Aircraft's Cabin Floor Configured to Accept 2X Stretcher if Needed",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "ADAHRS Step 1 to 2 Variant P/N 6F3410P0041 (SB 169-105)",
            "ASB 169-147 Yaw Pedal Protection",
            "BT169-018 Part III (Retractable LDG System Upgrade)",
            "BT 169-024 (Increased MTOW 4,800 KG)",
            "BT 169-060 (EAPS Install)",
            "BT 169-063 (Fuel XFER Pump Electrical) P/N 6F2820A00211",
            "BT 169-063 (Fuel XFER Pump Electrical) P/N 6F2820A00511",
            "BT 169-063 (Upper Panel Rework) P/N 6F5338P01851",
            "BT 169-067 (ENG GIMBAL Improvement)",
            "BT 169-077 RIBS STA 4680 Strengthening P/N 6F5333P00611",
            "SB169-075 Collective Retromod P/N 6F6711P01112",
            "SB169-075 Line Clipping P/N 6F0630P00511",
            "SB169-076 Part I (Mod. of Cargo Hook Camera)",
            "SB169-096 Cabin Floor Upgrade",
            "SB169-108 Nose Bay Structural Reinforcement",
            "Kit 8 SEAT 450MM Face to Face",
            "Kit Active Noise Reduct, Cockpit Headset",
            "Cargo Hook Complete Provision",
            "Cargo Hook Fixed Parts",
            "Kit Baggage Compartment Anchor System",
            "Kit Baggage Door Rain Gutter",
            "Kit Baggage Interior Liners",
            "Kit Baggage Net",
            "Kit Baggage Step Scuff Protection",
            "Kit Beanie Main Rotor",
            "Kit Cargo Hook Camera",
            "Kit EAPS, Cowling Structural Provision",
            "Kit EAPS, Cowling Structural Provision",
            "Kit ELT Emergency Floats",
            "Kit External Video Camera",
            "Kit Retractable Landing Gear System + LGS. From Retract to Fixed Retromode",
            "Kit Rotor Brake",
            "Kit Strobe Light",
            "Kit Subfloor Sealing",
            "Porthole, Aft Kit",
          ],
        },
      ],
    },
    {
      slug: "2021-airbus-h130",
      category: "HELICOPTER",
      title: "2021 Airbus H130",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2021",
        },
        {
          label: "Manufacturer",
          value: "Airbus Helicopters",
        },
        {
          label: "Total Time",
          value: "1000 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Air conditioning",
            "Standard factory interior",
            "Removable dual controls",
          ],
        },
      ],
    },
    {
      slug: "1979-longranger-206l-1",
      category: "HELICOPTER",
      title: "1979 Longranger 206L-1",
      serial: null,
      details: [
        {
          label: "Year",
          value: "1979",
        },
        {
          label: "Location",
          value: "Manitoba (Canada)",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "45342",
        },
        {
          label: "Total Time",
          value: "0 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: ["Utility configuration"],
        },
        {
          title: "Engine(s)",
          items: ["On Engine Program: no"],
        },
        {
          title: "Interior Details",
          items: [
            "Five (5) passenger seats",
            "Cabin floor protectors",
            "Litter kit",
            "Bleed air heating",
          ],
        },
        {
          title: "Exterior Details",
          items: [
            "Dart heli basket",
            "AAI Cargo mirror",
            "Snow deflectors",
            "VanHorne main rotor blades",
            "High skid gear",
            "Dart bear paws",
            "Hinged fuel cap",
            "Wire strike protection",
            "AAI flitesteps",
            "Particle separator",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Survival kit",
            "AAI door opening and restraint kits",
            "Baggage bay extension",
            "Cargo hook & Load cell",
            "Concorde lead acid battery",
            "AAI Range extender",
            "Crew wedge window - RH",
            "Facet oil filter",
            "AAI Hat rack safety net",
            "Chin bubble windows",
            "Soundproofing",
            "AAI Collective safety cover",
            "First aid kit",
            "Dual controls",
            "Cold weather preheat kit",
          ],
        },
      ],
    },
    {
      slug: "1970-jetranger-206b",
      category: "HELICOPTER",
      title: "1970 Jetranger 206B",
      serial: null,
      details: [
        {
          label: "Year",
          value: "1970",
        },
        {
          label: "Location",
          value: "Manitoba (Canada)",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "0648",
        },
        {
          label: "Total Time",
          value: "23090 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: ["Utility configuration"],
        },
        {
          title: "Engine(s)",
          items: ["On Engine Program: no"],
        },
        {
          title: "Interior Details",
          items: [
            "Four (4) passenger seats",
            "Litter kit",
            "Cabin floor protectors",
            "Survival kit",
            "Cold weather preheat kit",
            "AAI Hat rack safety net",
            "AAI Baggage floor protector",
            "First aid kit",
            "Bleed air heating",
            "Dual controls",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "AAI windscreen",
            "AAI collective safety cover",
            "Snow deflectors",
            "AAI flitesteps",
            "AAI range extender",
            "Onboard cargo hook & load weigh",
            "Concorde lead acid battery",
            "Particle separator",
            "Whelen landing lights",
            "Bubble windows",
            "Hinged fuel cap",
            "AAI High skid gear",
            "Dart bear paws",
            "AAI Cargo mirror",
            "Windshield defog kit",
            "AAI maintenance step",
            "AAI Rain gutter kit",
            "VanHorn tail rotor blades",
            "Fact oil filter",
            "Wire strike protection",
          ],
        },
      ],
    },
    {
      slug: "2014-sikorsky-s-92a",
      category: "HELICOPTER",
      title: "2014 Sikorsky S-92A",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2014",
        },
        {
          label: "Location",
          value: "Florida (USA)",
        },
        {
          label: "Manufacturer",
          value: "Sikorsky",
        },
        {
          label: "Serial Number",
          value: "920260",
        },
        {
          label: "Registration No",
          value: "N267RF",
        },
        {
          label: "Total Time",
          value: "2886 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Reduced Price Guidance",
            "Offshore Configuration",
            "Fully IFR Certification",
            "New Exterior Paint Q2 2022",
            "Low Hours",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 2,886.6", "Landings: 3,868"],
        },
        {
          title: "Engine(s)",
          items: ["TT: 3,978.4 / 2,755.9", "Cycles: 2,094 / 1,473"],
        },
        {
          title: "Maintenance Status",
          items: [
            "Major Components / Limit / Remaining / %",
            "Main rotor blades x 4 / 22,000 / 19,113.4 / 86.9%",
            "Main rotor hub assembly / 9,000 / 6,113.4 / 67.9%",
            "Main rotor hub assembly / 10,500 / 7,613.4 / 72.5%",
            "Main rotor shaft / 10,500 / 7,613.4 / 72.5%",
            "IGB centre housing / 17,100 / 14,213.4 / 83.1%",
            "TGB output housing / 17,000 / 14,113.4 / 83.0%",
            "Tail rotor blades / 10,000 / 7,113.4 / 71.1%",
            "Main rotor servo / 17,000 / 14,113.4 / 83.0%",
            "Main rotor servo / 17,000 / 13,904.5 / 81.8%",
            "Main rotor servo / 17,000 / 16,978.9 / 99.9%",
            "APU rotor assembly / 10,000 / 8,280.6 / 82.8%",
            "CT87-8A - inspection / 1,500 / 359.0 / 23.9%",
            "CT87-8A - inspection / 1,500 / 236.0 / 15.7%",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Dual Controls",
            "Jettisonable Cabin Windows",
            "Windshield Wipers",
            "Life Raft",
            "Airstair Door",
            "HEELS",
            "Pulselight System",
            "Pressure Refueling",
            "Rotor Brake",
            "Emergency Floatation System",
            "Heated Windshield",
            "Anti-Vibration Control System",
            "Strobe Lights",
            "Anti-Collision Lights",
            "Controllable Searchlight",
            "Engine Wash Kit & Drain Collector",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Nineteen (19) Passenger Seats",
            "One (1) Attendant Seat",
            "Cabin Heating & Air Conditioning",
            "Baggage Bay Shelf and Nets",
          ],
        },
      ],
    },
    {
      slug: "2009-eurocopter-as350b-3",
      category: "HELICOPTER",
      title: "2009 Eurocopter AS350B-3+",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2009",
        },
        {
          label: "Location",
          value: "Australia",
        },
        {
          label: "Manufacturer",
          value: "Eurocopter",
        },
        {
          label: "Total Time",
          value: "3195 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Well-Maintained",
            "Air Conditioning",
            "Dart Wirestrike/Cable Cutter Kit",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 3,195"],
        },
        {
          title: "Engine(s)",
          items: [
            "Safran Arriel 2B1",
            "Time Remaining:",
            "Module 1: 305",
            "Module 2: 305",
            "Module 3: 2,187",
            "Module 4: 305",
            "Module 5: 305",
            "On Engine Program: No",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "Time Remaining:",
            "MGB: On Condition",
            "TGB: 2,866",
            "MRB: 17,350",
            "TRB: 805",
            "Starflex: 1,952",
          ],
        },
        {
          title: "Exterior Details",
          items: [
            "Light grey, Midnight Blue with Light Blue and Green Accents",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Odyssey Lead Acid Battery",
            "Dart Vertical Reference Window",
            "Dart Heli-Access-Step",
            "Onboard Systems Cargo Swing",
            "Dart Wirestrike/Cable Cutter Kit",
            "RSG Air Conditioner Unit",
            "Tail Rotor Protector",
            "Slider Door (LHS)",
            "Flight Manual Holder",
            "USB Power Socket",
            "Aux Plus (24V)",
            "GI275 Multi-Function Display",
            "High Intensity LED Strokes",
            "Starlink Internet (Not Available in Flight)",
            "Water Hog",
            "Siren",
            "Pulse Lights",
          ],
        },
        {
          title: "Interior Details",
          items: ["Black Interior", "Coin Dot Flooring"],
        },
      ],
    },
    {
      slug: "2019-bell-407-gxi",
      category: "HELICOPTER",
      title: "2019 Bell 407 GXI",
      serial: null,
      details: [
        {
          label: "Year",
          value: "2019",
        },
        {
          label: "Location",
          value: "Texas (USA)",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Serial Number",
          value: "54842",
        },
        {
          label: "Registration No",
          value: "N34NX",
        },
        {
          label: "Total Time",
          value: "146 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "One Owner Since New & US-Based",
            "Corporate Configuration and Soundproofing (5 Pax)",
            "Blade Folding System",
            "Bubble Cabin Windows",
            "Paravion Air Conditioning",
            "Traffic Avoidance System",
            "12 & 24-Month Inspections Completed August 2025",
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 146", "Landings: 97"],
        },
        {
          title: "Engine(s)",
          items: [
            "Rolls Royce 250-C47E/4",
            "TTSN: 146",
            "Engine SN1: CAE-854037",
            "On Engine Program: No",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "This five (5) passenger interior features two (2) aft facing captain chairs separated by an armrest positioned across from a three (3) place bench seat.",
          ],
        },
        {
          title: "Exterior Details",
          items: ["Overall Black with Gray Accent"],
        },
        {
          title: "Maintenance Status",
          items: [
            "Items / Complied with / Next Due",
            "12 Month / Aug-25 / Aug-26",
            "24 Month / Aug-25 / Aug-27",
          ],
        },
        {
          title: "Features & Options",
          items: [
            "Polycarbonate Windshield and Interior Kit",
            "High Visibility & Jettisonable Doors",
            "Wire Strike Protection System",
            "Inlet Barrier Filter (IBF)",
            "Baggage Floor Protector",
            "Tail Rotor Camera",
            "Inlet Barrier Filter w/ Access Door",
            "Dzus Fast Snow Deflector Baffle Kit",
            "Increased Starter Generator",
            "Main Rotor Blade Expandable Bolts",
            "Bulged Skylight Kit",
            "Paravion Bleed Air Heating System",
            "Fuel Cap Protector Kit",
            "Aeronautical Accessories Spacemaker",
            "Concorde Battery RG407A1",
            "LED Landing and Taxi Lights",
            "Aeronautical Accessories Door & Baggage Door Opener Kit",
          ],
        },
      ],
    },
    {
      slug: "1989-bell-206-l-3",
      category: "HELICOPTER",
      title: "1989 Bell 206 L-3",
      serial: null,
      details: [
        {
          label: "Year",
          value: "1989",
        },
        {
          label: "Location",
          value: "Australia",
        },
        {
          label: "Manufacturer",
          value: "Bell",
        },
        {
          label: "Total Time",
          value: "15383 hrs",
        },
        {
          label: "Price",
          value: "On request",
        },
      ],
      sections: [
        {
          title: "Summary",
          items: [
            "Good Times Remaining",
            "Well-Maintained",
            "Inlet Barrier Filter",
            "Cargo Hook",
            "Wirestrike/Cable Cutter Kit",
            'Only Ever Had "Bell" Main Rotor Blades Fitted',
          ],
        },
        {
          title: "Airframe",
          items: ["TT: 15,383"],
        },
        {
          title: "Engine(s)",
          items: [
            "Rolls Royce 250-C30P",
            "Time Remaining:",
            "Stage 2: 697",
            "Stage 3: 3,222",
            "Stage 4: 3,222",
          ],
        },
        {
          title: "Interior Details",
          items: [
            "Configuration: Utility",
            "Black Leather",
            "Accessories:",
            "USB Power Socket",
            "AUX Plugs (24V)",
            "Water Hog",
            "Sirenpulse Lights",
            "Digital Volt/OAT Gauge",
            "JA33-001 Bluetooth",
            "Remote Torque Gauge",
            "High Intensity LED Strobes",
            "Starlink Internet (Not Available in Flight)",
          ],
        },
        {
          title: "Exterior Details",
          items: ["Red"],
        },
        {
          title: "Features & Options",
          items: [
            "Aerometals Inlet Barrier Filter",
            "Dart Cargo Basket and Quick Release Flight Step",
            "Odyssey Lead Acid Battery",
            "Van Horn Tail Rotor Lockout Kit",
            "Lord Elastomeric Tail Rotor Flapping Bearing",
            "Onboard Systems Cargo Hook",
            "Wirestrike/Cable Cutter Kit",
            "DAAM Engine Monitoring System",
            "Cargo Mirror",
            "PC Safety Valve Kit",
            "Engine Oil Facet Filter Kit",
          ],
        },
        {
          title: "Maintenance Status",
          items: [
            "Components Time Remaining:",
            "MGB: 3,982",
            "TGB: 2,495",
            "MRB: 989",
            "TRB: 1,338",
          ],
        },
      ],
    },
  ],
} as const satisfies {
  listings: readonly SaleListing[];
  [key: string]: unknown;
};
