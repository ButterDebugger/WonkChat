import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.tsx";
import NotFound from "./pages/NotFound.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route index element={<Home />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);
