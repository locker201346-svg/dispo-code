import { createFileRoute } from "@tanstack/react-router";

import { DispoBoardV2 } from "@/components/dispo/DispoBoardV2";

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title: "Disposition v2 – Aufträge einplanen & Material prüfen" },
      {
        name: "description",
        content:
          "Version 2 der Disposition: Zeitplan mit Uhrzeiten, automatische Einplanung, Einkaufsliste und Dunkelmodus.",
      },
    ],
  }),
  component: () => <DispoBoardV2 v1Href="/" />,
});
