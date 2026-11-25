import { createRoot } from "react-dom/client";
import "../src/styles.css";
import { DispoBoardV2 } from "@/components/dispo/DispoBoardV2";

createRoot(document.getElementById("root")!).render(<DispoBoardV2 v1Href="dispo.html" />);
