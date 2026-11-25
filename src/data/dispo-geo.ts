// Koordinaten der Einsatzorte für die Karte (Version 2, Ansicht «Einsätze").
// Ermittelt über OpenStreetMap/Nominatim. «approx: true» = Adresse nicht in OSM
// gefunden, Punkt liegt in der Ortsmitte. Genaue Koordinaten einfach hier eintragen.

export interface GeoPoint {
  lat: number;
  lng: number;
  approx?: boolean;
}

/** Startpunkt der Tour (Betrieb). Bei Bedarf auf die echte Betriebsadresse ändern. */
export const DEPOT: GeoPoint & { label: string } = {
  label: "Betrieb Elektro Meier, Aarau",
  lat: 47.3913,
  lng: 8.0511,
  approx: true,
};

export const ORDER_GEO: Record<string, GeoPoint> = {
  "A-101": { lat: 47.3927, lng: 8.0444, approx: true }, // Werkstrasse 12, Aarau
  "A-102": { lat: 47.3895, lng: 8.0755, approx: true }, // Hofweg 7, Buchs AG
  "A-103": { lat: 47.3732, lng: 8.0795, approx: true }, // Saalweg 3, Suhr
  "A-104": { lat: 47.3895, lng: 8.0425, approx: true }, // Gartenweg 8, Aarau
  "A-105": { lat: 47.3588, lng: 8.0966 }, // Bachweg 11, Gränichen
  "A-106": { lat: 47.3104, lng: 8.1147, approx: true }, // Mühleweg 5, Unterkulm
  "A-107": { lat: 47.3722, lng: 8.0054, approx: true }, // Auenweg 4, Schönenwerd
  "A-108": { lat: 47.3568, lng: 8.0471, approx: true }, // Rainweg 2, Oberentfelden
  "A-109": { lat: 47.3969, lng: 8.0192 }, // Haldenweg 3, Erlinsbach
};
