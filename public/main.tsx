import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/oauth/Login.tsx";
import LoginClose from "./pages/oauth/LoginClose.tsx";
import Privacy from "./pages/Privacy.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route index element={<Home />} />
				<Route path="/privacy" element={<Privacy />} />
				<Route path="/oauth/login" element={<Login />} />
				<Route path="/oauth/login/close" element={<LoginClose />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);
