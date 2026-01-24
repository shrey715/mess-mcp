#!/usr/bin/env tsx
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MoodleMCPClient } from "./index.js";

/**
 * Moodle MCP Stdio Server
 * 
 * This server acts as a bridge between Claude (stdio) and the Moodle MCP API (HTTP).
 */
const MOODLE_URL = process.env.MOODLE_URL || "http://localhost:8085";
const MOODLE_TOKEN = process.env.MOODLE_TOKEN || "6e46f93f5f12b5bf476e7f2b8e7d6ba3";

const client = new MoodleMCPClient({
    baseUrl: `${MOODLE_URL}/webservice/mcp/server.php`,
    token: MOODLE_TOKEN,
});

const server = new Server(
    {
        name: "moodle-bridge",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * List available tools from Moodle
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_courses",
                description: "Get all enrolled courses from Moodle",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "get_assignments",
                description: "Get pending assignments for given course IDs",
                inputSchema: {
                    type: "object",
                    properties: {
                        courseIds: { type: "array", items: { type: "number" }, description: "List of course IDs" },
                    },
                    required: ["courseIds"],
                },
            },
            {
                name: "get_course_materials",
                description: "Get materials (PDFs, files) for a specific course",
                inputSchema: {
                    type: "object",
                    properties: {
                        courseId: { type: "number", description: "The ID of the course" },
                    },
                    required: ["courseId"],
                },
            },
            {
                name: "ask_graphrag",
                description: "Ask a question about course materials using Knowledge Graph and Vector search",
                inputSchema: {
                    type: "object",
                    properties: {
                        question: { type: "string", description: "The question to ask" },
                    },
                    required: ["question"]
                }
            }
        ],
    };
});

/**
 * Tool call handler
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "get_courses": {
                const courses = await client.getCourses();
                return {
                    content: [{ type: "text", text: JSON.stringify(courses, null, 2) }],
                };
            }

            case "get_assignments": {
                const courseIds = args?.courseIds as number[];
                try {
                    const assignments = await client.getAssignments(courseIds);
                    process.stderr.write(`[DEBUG] Got ${assignments.length} assignments\n`);
                    return {
                        content: [{ type: "text", text: JSON.stringify(assignments, null, 2) }],
                    };
                } catch (err: any) {
                    process.stderr.write(`[ERROR] getAssignments failed: ${err.message}\n`);
                    throw err;
                }
            }

            case "get_course_materials": {
                const courseId = args?.courseId as number;
                const materials = await client.getCourseMaterials(courseId);
                return {
                    content: [{ type: "text", text: JSON.stringify(materials, null, 2) }],
                };
            }

            case "ask_graphrag": {
                const question = args?.question as string;
                // Trigger the suggest_study.py script and return findings
                const { execSync } = await import('child_process');
                const scriptPath = '/home/vishak/hackiiit\'26/OnlyApps/mcp_servers/moodle_mcp/suggest_study.py';
                const result = execSync(`python3 "${scriptPath}" "${question.replace(/"/g, '\\"')}"`).toString();

                return {
                    content: [{ type: "text", text: result }]
                };
            }

            default:
                throw new Error(`Tool not found: ${name}`);
        }
    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

/**
 * Start the server using stdio transport
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Server started successfully - no logging to stderr to avoid warnings
}

main().catch((error) => {
    process.stderr.write(`Server error: ${error}\n`);
    process.exit(1);
});
