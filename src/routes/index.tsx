import { createFileRoute } from "@tanstack/react-router";

import { DispoBoardV2 } from "@/components/dispo/DispoBoardV2";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Disposition – Aufträge einplanen & Material prüfen" },
      {
        name: "description",
        content:
          "Interaktive Disposition: Aufträge einplanen, Materialbestand in Echtzeit abgleichen und bei fehlendem Material sofort warnen.",
      },
      { property: "og:title", content: "Disposition – Aufträge einplanen & Material prüfen" },
      {
        property: "og:description",
        content:
          "Aufträge disponieren und den Lagerbestand live prüfen – fehlendes Material wird sofort gemeldet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <DispoBoardV2 />;
}
