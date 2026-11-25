export interface OrderItem {
  sku: string;
  label: string;
  qty: number;
}

export interface Order {
  id: string;
  client: string;
  town: string;
  street: string;
  title: string;
  minutes: number;
  tasks: string[];
  items: OrderItem[];
}

export interface InventoryEntry {
  sku: string;
  label: string;
  stock: number;
}

// Quelle: auftraege.json
export const ORDERS: Order[] = [
  {
    id: "A-101",
    client: "Atelier Linde",
    town: "Aarau",
    street: "Werkstrasse 12",
    title: "Netzwerk erweitern",
    minutes: 60,
    tasks: ["Anschlüsse prüfen", "Switch montieren", "Verbindung testen"],
    items: [
      { sku: "NET-01", label: "Patchkabel", qty: 3 },
      { sku: "SW-08", label: "Switch, 8 Ports", qty: 1 },
    ],
  },
  {
    id: "A-102",
    client: "Werkstatt Aare",
    town: "Buchs AG",
    street: "Hofweg 7",
    title: "Arbeitsplätze anschliessen",
    minutes: 90,
    tasks: ["Leitungen beschriften", "Arbeitsplätze verbinden"],
    items: [
      { sku: "NET-01", label: "Patchkabel", qty: 4 },
      { sku: "DO-02", label: "Anschlussdose", qty: 2 },
    ],
  },
  {
    id: "A-103",
    client: "Forum Suhre",
    town: "Suhr",
    street: "Saalweg 3",
    title: "Saaltechnik prüfen",
    minutes: 45,
    tasks: ["Bildsignal prüfen", "Übergabe dokumentieren"],
    items: [{ sku: "HD-02", label: "HDMI-Kabel", qty: 2 }],
  },
  {
    id: "A-104",
    client: "Büro Farbwerk",
    town: "Aarau",
    street: "Gartenweg 8",
    title: "WLAN im Büro erweitern",
    minutes: 75,
    tasks: ["Access Point montieren", "WLAN testen"],
    items: [
      { sku: "AP-01", label: "WLAN-Access-Point", qty: 1 },
      { sku: "NET-01", label: "Patchkabel", qty: 3 },
    ],
  },
  {
    id: "A-105",
    client: "Praxis Birke",
    town: "Gränichen",
    street: "Bachweg 11",
    title: "Empfangsdisplay montieren",
    minutes: 90,
    tasks: ["Display befestigen", "Signal prüfen"],
    items: [
      { sku: "DS-01", label: "Display", qty: 1 },
      { sku: "HW-04", label: "Wandhalterung", qty: 1 },
      { sku: "HD-02", label: "HDMI-Kabel", qty: 1 },
    ],
  },
  {
    id: "A-106",
    client: "Studio Wyna",
    town: "Unterkulm",
    street: "Mühleweg 5",
    title: "Arbeitsplätze einrichten",
    minutes: 60,
    tasks: ["Dockingstationen anschliessen", "Netzwerk prüfen"],
    items: [
      { sku: "US-01", label: "USB-C-Dock", qty: 2 },
      { sku: "NET-01", label: "Patchkabel", qty: 2 },
    ],
  },
  {
    id: "A-107",
    client: "Werkhof West",
    town: "Schönenwerd",
    street: "Auenweg 4",
    title: "Netzwerkschrank erweitern",
    minutes: 120,
    tasks: ["Switches einbauen", "Ports prüfen"],
    items: [
      { sku: "SW-08", label: "Switch, 8 Ports", qty: 2 },
      { sku: "NET-01", label: "Patchkabel", qty: 6 },
    ],
  },
  {
    id: "A-108",
    client: "Treffpunkt Rain",
    town: "Oberentfelden",
    street: "Rainweg 2",
    title: "Besprechungsraum ausstatten",
    minutes: 105,
    tasks: ["Display montieren", "Bildübertragung testen"],
    items: [
      { sku: "DS-01", label: "Display", qty: 1 },
      { sku: "HW-04", label: "Wandhalterung", qty: 1 },
      { sku: "HD-02", label: "HDMI-Kabel", qty: 2 },
    ],
  },
  {
    id: "A-109",
    client: "Atelier Erle",
    town: "Erlinsbach",
    street: "Haldenweg 3",
    title: "Funknetz ergänzen",
    minutes: 45,
    tasks: ["Funkabdeckung prüfen", "Access Point einrichten"],
    items: [
      { sku: "AP-01", label: "WLAN-Access-Point", qty: 2 },
      { sku: "NET-01", label: "Patchkabel", qty: 2 },
    ],
  },
];

// Quelle: inventar.csv
export const INVENTORY: InventoryEntry[] = [
  { sku: "AP-01", label: "WLAN-Access-Point", stock: 2 },
  { sku: "DO-02", label: "Anschlussdose", stock: 5 },
  { sku: "DS-01", label: "Display", stock: 1 },
  { sku: "HD-02", label: "HDMI-Kabel", stock: 4 },
  { sku: "HW-04", label: "Wandhalterung", stock: 2 },
  { sku: "NET-01", label: "Patchkabel", stock: 8 },
  { sku: "SW-08", label: "Switch, 8 Ports", stock: 2 },
  { sku: "US-01", label: "USB-C-Dock", stock: 3 },
];
