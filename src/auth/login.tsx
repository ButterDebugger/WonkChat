import type { Context } from "hono";
import { stream } from "hono/streaming";
// import type { FC } from "hono/jsx";
import path from "node:path";
import process from "node:process";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { SessionEnv } from "./session.ts";

const router = new OpenAPIHono<SessionEnv>();

// const Layout: FC = (props) => {
// 	return (
// 		<html lang="en">
// 			<head>
// 				<meta charset="UTF-8" />
// 				<meta http-equiv="X-UA-Compatible" content="IE=edge" />
// 				<meta
// 					name="viewport"
// 					content="width=device-width, initial-scale=1.0"
// 				/>
// 				<title>{props.title}</title>
// 				<link
// 					rel="stylesheet"
// 					href="https://debutter.dev/x/css/style.css@1.2"
// 				/>
// 				<link rel="stylesheet" href="/style.css" />
// 			</head>
// 			<body class="zero-margin">
// 				<div id="root">
// 					<main>{props.children}</main>
// 				</div>
// 			</body>
// 		</html>
// 	);
// };

// const Top: FC<{ title: string; messages: string[] }> = (props: {
// 	title: string;
// 	messages: string[];
// }) => {
// 	return (
// 		<Layout title={props.title}>
// 			<h1>Hello Hono!</h1>
// 			<ul>
// 				{props.messages.map((message) => {
// 					return <li>{message}!!</li>;
// 				})}
// 			</ul>
// 		</Layout>
// 	);
// };

router.get("/close/redirect.js", (ctx) =>
	streamFile(
		ctx,
		path.join(process.cwd(), "./public/close/redirect.js"),
		"application/javascript"
	)
);
router.get("/close/", (ctx) =>
	streamFile(
		ctx,
		path.join(process.cwd(), "./public/close/index.html"),
		"text/html"
	)
);
router.get("/style.css", (ctx) =>
	streamFile(ctx, path.join(process.cwd(), "./public/style.css"), "text/css")
);
router.get("/main.js", (ctx) =>
	streamFile(
		ctx,
		path.join(process.cwd(), "./public/main.js"),
		"application/javascript"
	)
);
router.get("/", (ctx) =>
	streamFile(
		ctx,
		path.join(process.cwd(), "./public/login.html"),
		"text/html"
	)
);
router.get("*", (ctx) => {
	return ctx.text("404 Not Found", 404);
});

function streamFile(ctx: Context, filePath: string, type: string) {
	ctx.header("Content-Type", type);

	return stream(ctx, async (stream) => {
		const file = Bun.file(filePath);
		const arrayBuffer = await file.arrayBuffer();
		stream.write(new Uint8Array(arrayBuffer));
	});
}

export default router;
