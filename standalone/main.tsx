import { createRoot } from "react-dom/client";
import "../src/styles.css";
import { DispoBoard } from "@/components/dispo/DispoBoard";

createRoot(document.getElementById("root")!).render(<DispoBoard />);
