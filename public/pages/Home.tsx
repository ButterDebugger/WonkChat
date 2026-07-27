import javascriptLogo from "/javascript.svg";
import honoLogo from "/hono.svg";
import viteLogo from "/vite.svg";
import { useState } from "react";

export default function Home() {
	const [count, setCount] = useState(0);

	return (
		<>
			<a href="https://vite.dev" target="_blank">
				<img src={viteLogo} className="logo" alt="Vite logo" />
			</a>
			<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
				<img src={javascriptLogo} className="logo js" alt="JavaScript logo" />
			</a>
			<a href="https://hono.dev/" target="_blank">
				<img src={honoLogo} className="logo hono" alt="Hono logo" />
			</a>
			<h1>Hello Vite + JS + Hono!</h1>
			<div className="card">
				<button type="button" onClick={() => setCount((count) => count + 1)}>
					Count is {count}
				</button>
			</div>
			<p className="read-the-docs">Click on the Vite logo to learn more</p>
		</>
	);
}
