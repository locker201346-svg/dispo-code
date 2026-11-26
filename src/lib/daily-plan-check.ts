import type { Order } from "@/data/dispo-data";
import { ORDER_GEO } from "@/data/dispo-geo";
import { shortagesFor } from "@/lib/dispo";

export const MAX_SHIFT_MINUTES = 9 * 60;

export interface DailyPlanCheck {
  id: "employee" | "material" | "route" | "worktime";
  label: string;
  status: "pass" | "fail" | "warning" | "pending";
  message: string;
}

interface DailyPlanCheckInput {
  employeeName: string;
  employeeAvailable: boolean;
  orders: Order[];
  travelMinutes: number;
  maxWorkMinutes?: number;
}

export function estimatedWorkMinutes(orders: Order[], travelMinutes: number): number {
  const serviceMinutes = orders.reduce((total, order) => total + order.minutes, 0);
  const travelBetweenOrders = Math.max(0, orders.length - 1) * travelMinutes;
  return serviceMinutes + travelBetweenOrders;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} h`;
  if (hours === 0) return `${remainder} min`;
  return `${hours} h ${remainder} min`;
}

export function checkDailyPlan({
  employeeName,
  employeeAvailable,
  orders,
  travelMinutes,
  maxWorkMinutes = MAX_SHIFT_MINUTES,
}: DailyPlanCheckInput): DailyPlanCheck[] {
  const name = employeeName.trim();
  const materialShortages = shortagesFor(orders);
  const missingCoordinates = orders.filter((order) => !ORDER_GEO[order.id]);
  const approximateStops = orders.filter((order) => ORDER_GEO[order.id]?.approx);
  const estimatedMinutes = estimatedWorkMinutes(orders, travelMinutes);

  return [
    {
      id: "employee",
      label: "Mitarbeiter",
      status: !name || !employeeAvailable ? "fail" : "pass",
      message: !name
        ? "Kein Mitarbeiter eingetragen. Bitte im Bereich «Mitarbeiter» einen Namen hinterlegen."
        : employeeAvailable
          ? `${name} ist für den heutigen Einsatz verfügbar.`
          : `${name} ist als heute nicht verfügbar markiert.`,
    },
    {
      id: "material",
      label: "Material",
      status: materialShortages.length > 0 ? "fail" : "pass",
      message:
        materialShortages.length === 0
          ? orders.length === 0
            ? "Kein Materialbedarf, da noch keine Aufträge geplant sind."
            : "Der Lagerbestand reicht für alle geplanten Aufträge."
          : materialShortages
              .map(
                (shortage) =>
                  `${shortage.label} (${shortage.sku}): ${shortage.missing} Stück fehlen ` +
                  `(benötigt ${shortage.needed}, vorhanden ${shortage.available}).`,
              )
              .join(" "),
    },
    {
      id: "route",
      label: "Route",
      status:
        orders.length === 0
          ? "pending"
          : missingCoordinates.length > 0
            ? "fail"
            : approximateStops.length > 0
              ? "warning"
              : "pass",
      message:
        orders.length === 0
          ? "Noch keine Aufträge geplant. Eine Route kann erst mit mindestens einem Einsatz geprüft werden."
          : missingCoordinates.length > 0
            ? `Für ${missingCoordinates.map((order) => order.id).join(", ")} fehlen Kartenkoordinaten. Diese Stopps können nicht auf der Karte dargestellt werden.`
            : approximateStops.length > 0
              ? `Alle Stopps sind routbar, aber ${approximateStops.map((order) => order.id).join(", ")} verwenden nur ungefähre Ortsmitten-Koordinaten.`
              : `Alle ${orders.length} Einsatzorte haben genaue Kartenkoordinaten.`,
    },
    {
      id: "worktime",
      label: "Arbeitszeit",
      status: estimatedMinutes > maxWorkMinutes ? "fail" : "pass",
      message:
        estimatedMinutes > maxWorkMinutes
          ? `Geplant sind ${formatDuration(estimatedMinutes)} inklusive geschätzter Fahrten. Das Limit von ${formatDuration(maxWorkMinutes)} wird um ${formatDuration(estimatedMinutes - maxWorkMinutes)} überschritten.`
          : `${formatDuration(estimatedMinutes)} von maximal ${formatDuration(maxWorkMinutes)} eingeplant (Fahrzeit zwischen Einsätzen eingerechnet).`,
    },
  ];
}
