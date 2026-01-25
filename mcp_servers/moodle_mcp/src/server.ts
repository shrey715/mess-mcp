#!/usr/bin/env tsx
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MoodleMCPClient, TokensConfig, RoleConfig } from "./index.js";
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = join(__dirname, '..', 'tokens.json');

function loadTokens(): TokensConfig {
    if (!existsSync(TOKENS_FILE)) {
        // Fallback or error
        process.stderr.write(`[ERROR] tokens.json not found at ${TOKENS_FILE}\n`);
        return {
            moodleUrl: process.env.MOODLE_URL || "http://localhost:8085",
            roles: {
                admin: {
                    token: process.env.MOODLE_TOKEN || "6e46f93f5f12b5bf476e7f2b8e7d6ba3",
                    userId: 2,
                    name: "Admin User",
                    description: "Site Administrator"
                }
            },
            defaultRole: "admin"
        };
    }
    const content = readFileSync(TOKENS_FILE, 'utf-8');
    return JSON.parse(content);
}

const tokensConfig = loadTokens();
let currentRole = tokensConfig.defaultRole;

function getClient() {
    const tokens = loadTokens();
    const roleConfig = tokens.roles[currentRole];
    return new MoodleMCPClient({
        baseUrl: `${tokens.moodleUrl}/webservice/mcp/server.php`,
        token: roleConfig.token,
    });
}

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
                description: "Get all enrolled courses. To see roles first, you can use list_roles.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "list_roles",
                description: "List all available user roles (admin, teacher, student).",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "get_current_role",
                description: "Get the current active role/user.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "switch_role",
                description: "Switch to a different user role.",
                inputSchema: {
                    type: "object",
                    properties: {
                        role: { type: "string", description: "Role ID to switch to (e.g., 'admin', 'kumar', 'student1')" },
                    },
                    required: ["role"],
                },
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
                const courses = await getClient().getCourses();
                return {
                    content: [{ type: "text", text: JSON.stringify(courses, null, 2) }],
                };
            }

            case "list_roles": {
                const roles = Object.entries(tokensConfig.roles).map(([id, config]) => {
                    const roleConfig = config as RoleConfig;
                    return {
                        id,
                        name: roleConfig.name,
                        description: roleConfig.description || '',
                        isCurrent: id === currentRole,
                    };
                });
                return {
                    content: [{
                        type: "text",
                        text: `Available roles:\n${roles.map(r => `- ${r.id}: ${r.name}${r.isCurrent ? ' (CURRENT)' : ''}`).join('\n')}\n\nUse switch_role to change.`
                    }]
                };
            }

            case "get_current_role": {
                const roleConfig = tokensConfig.roles[currentRole];
                return {
                    content: [{
                        type: "text",
                        text: `Currently authenticated as: ${roleConfig.name} (${currentRole})\nUser ID: ${roleConfig.userId}`
                    }]
                };
            }

            case "switch_role": {
                const role = args?.role as string;
                if (!tokensConfig.roles[role]) {
                    return {
                        content: [{
                            type: "text",
                            text: `Role "${role}" not found. Available: ${Object.keys(tokensConfig.roles).join(', ')}`
                        }],
                        isError: true
                    };
                }
                currentRole = role;
                const roleConfig = tokensConfig.roles[role];
                return {
                    content: [{
                        type: "text",
                        text: `✅ Switched to: ${roleConfig.name} (${role})\nYou are now viewing Moodle as this user.`
                    }]
                };
            }

            case "get_assignments": {
                const courseIds = args?.courseIds as number[];
                try {
                    const assignments = await getClient().getAssignments(courseIds);
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
                const materials = await getClient().getCourseMaterials(courseId);
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
