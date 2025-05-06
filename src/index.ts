import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init(env?: any) {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);

		// get_resume_pdf tool
		this.server.tool(
			"get_resume_pdf",
			{}, // No input needed
			async (_) => {
				console.log({ env });
				const pdf = await env.mcp_kv.get("resume/pdf", "arrayBuffer");
				if (!pdf) {
					return {
						content: [
							{
								type: "text",
								text: "Resume PDF not found.",
							},
						],
					};
				}
				return {
					content: [
						{
							type: "file",
							file: {
								name: "resume.pdf",
								mime_type: "application/pdf",
								data: pdf,
							},
						},
					],
				};
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// @ts-ignore
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			// @ts-ignore
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		// Serve HTML for the root path
		if (url.pathname === "/") {
			return new Response(
				`<!DOCTYPE html>
				<html>
				<head>
				  <title>Welcome to My MCP Server</title>
				</head>
				<body>
				  <h1>Welcome to My MCP Server!</h1>
				  <p>This is a simple HTML page served by your Cloudflare Worker.</p>
				  <p>Try the <a href="/sse">/sse</a> endpoint for the MCP server.</p>
				</body>
				</html>`,
				{ headers: { "content-type": "text/html" } }
			);
		}

		return new Response("Not found", { status: 404 });
	},
};
