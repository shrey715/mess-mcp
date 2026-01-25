#!/usr/bin/env tsx
/**
 * Moodle MCP HTTP Server
 * 
 * HTTP-based server with dynamic role/token switching.
 * Allows seamless switching between student/teacher/admin in demos.
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MoodleMCPClient } from './index.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = join(__dirname, '..', 'tokens.json');

// Load tokens configuration
interface RoleConfig {
    token: string;
    userId: number;
    name: string;
    description?: string;
}

interface TokensConfig {
    moodleUrl: string;
    roles: Record<string, RoleConfig>;
    defaultRole: string;
}

function loadTokens(): TokensConfig {
    if (!existsSync(TOKENS_FILE)) {
        console.error(`tokens.json not found at ${TOKENS_FILE}`);
        process.exit(1);
    }
    const content = readFileSync(TOKENS_FILE, 'utf-8');
    return JSON.parse(content);
}

// State
let tokensConfig = loadTokens();
let currentRole = tokensConfig.defaultRole;
let pendingCalendarEvents: any[] = []; // Stores events for calendar sync

function getCurrentClient(): MoodleMCPClient {
    const roleConfig = tokensConfig.roles[currentRole];
    if (!roleConfig) {
        throw new Error(`Role "${currentRole}" not found in tokens.json`);
    }
    return new MoodleMCPClient({
        baseUrl: `${tokensConfig.moodleUrl}/webservice/mcp/server.php`,
        token: roleConfig.token,
    });
}

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// ============ Role Management Endpoints ============

// List all available roles
app.get('/roles', (req: Request, res: Response) => {
    const roles = Object.entries(tokensConfig.roles).map(([id, config]) => ({
        id,
        name: config.name,
        description: config.description || '',
        isCurrent: id === currentRole,
    }));
    res.json({ roles, currentRole });
});

// Get current role
app.get('/current-role', (req: Request, res: Response) => {
    const roleConfig = tokensConfig.roles[currentRole];
    res.json({
        role: currentRole,
        name: roleConfig?.name,
        userId: roleConfig?.userId,
    });
});

// Switch role
app.post('/switch-role', (req: Request, res: Response) => {
    const { role } = req.body;

    if (!role) {
        return res.status(400).json({ error: 'Role is required' });
    }

    if (!tokensConfig.roles[role]) {
        return res.status(404).json({
            error: `Role "${role}" not found`,
            availableRoles: Object.keys(tokensConfig.roles)
        });
    }

    currentRole = role;
    const roleConfig = tokensConfig.roles[role];

    console.log(`[MCP] Switched to role: ${role} (${roleConfig.name})`);

    res.json({
        success: true,
        role: currentRole,
        name: roleConfig.name,
        userId: roleConfig.userId,
    });
});

// Reload tokens from file
app.post('/reload-tokens', (req: Request, res: Response) => {
    try {
        tokensConfig = loadTokens();
        res.json({ success: true, roles: Object.keys(tokensConfig.roles) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ Direct API Endpoints (for LIHA app) ============

// Get courses for current role
app.get('/api/courses', async (req: Request, res: Response) => {
    try {
        const client = getCurrentClient();
        const courses = await client.getCourses();
        res.json(courses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get assignments for courses
app.post('/api/assignments', async (req: Request, res: Response) => {
    try {
        const { courseIds } = req.body;
        const client = getCurrentClient();
        const assignments = await client.getAssignments(courseIds || []);
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get site info for current role
app.get('/api/site-info', async (req: Request, res: Response) => {
    try {
        const client = getCurrentClient();
        const info = await client.getSiteInfo();
        res.json(info);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ Calendar Integration Endpoints ============

// Get pending calendar events (for calendar applet to fetch)
app.get('/api/calendar-events', async (req: Request, res: Response) => {
    try {
        const events = [...pendingCalendarEvents];
        res.json({ 
            events,
            count: events.length,
            syncedAt: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Sync assignments to calendar events (REST endpoint for direct calls)
app.post('/api/sync-to-calendar', async (req: Request, res: Response) => {
    try {
        const { courseIds } = req.body;
        const client = getCurrentClient();
        
        let ids = courseIds;
        if (!ids || ids.length === 0) {
            const courses = await client.getCourses();
            ids = courses.map((c: any) => c.id);
        }
        
        const assignments = await client.getAssignments(ids);
        const now = Math.floor(Date.now() / 1000);
        
        const calendarEvents = assignments
            .filter((a: any) => a.duedate > now)
            .map((a: any) => ({
                id: `moodle-assign-${a.id}`,
                title: `📚 ${a.courseShortname || a.courseName}: ${a.name}`,
                start: a.duedate * 1000,
                end: a.duedate * 1000 + 3600000,
                description: a.intro?.replace(/<[^>]*>/g, '') || 'Assignment deadline',
                location: 'Moodle LMS',
                source: 'moodle',
                courseId: a.course,
                courseName: a.courseName || a.courseShortname,
            }));
        
        pendingCalendarEvents = calendarEvents;
        
        res.json({ 
            success: true,
            events: calendarEvents,
            count: calendarEvents.length
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ MCP Streamable HTTP Endpoint ============

// Store active transports and servers for sessions
const sessions: Map<string, { transport: StreamableHTTPServerTransport; server: Server }> = new Map();

// Create MCP server instance with tools
function createMCPServer(): Server {
    const mcpServer = new Server(
        { name: 'moodle-mcp-http', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );

    // Tool listing
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            // ===== Role Management Tools =====
            {
                name: 'list_roles',
                description: 'List all available user roles (admin, teacher, student). Use this to see who you can switch to.',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_current_role',
                description: 'Get the current active role/user. Shows who you are currently authenticated as.',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'switch_role',
                description: 'Switch to a different user role. Available roles: admin, kumar (teacher), student1. This changes whose data you see.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        role: {
                            type: 'string',
                            description: 'Role ID to switch to (e.g., "admin", "kumar", "student1")'
                        },
                    },
                    required: ['role'],
                },
            },
            // ===== Moodle Data Tools =====
            {
                name: 'get_courses',
                description: 'Get all enrolled courses from Moodle for the current user role',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'get_assignments',
                description: 'Get pending assignments for given course IDs',
                inputSchema: {
                    type: 'object',
                    properties: {
                        courseIds: { type: 'array', items: { type: 'number' } },
                    },
                    required: ['courseIds'],
                },
            },
            {
                name: 'get_course_materials',
                description: 'Get materials (PDFs, files) for a specific course',
                inputSchema: {
                    type: 'object',
                    properties: {
                        courseId: { type: 'number' },
                    },
                    required: ['courseId'],
                },
            },
            {
                name: 'ask_graphrag',
                description: 'Ask a question about course materials using Knowledge Graph and Vector search',
                inputSchema: {
                    type: 'object',
                    properties: {
                        question: { type: 'string', description: 'The question to ask' },
                    },
                    required: ['question'],
                },
            },
            // ===== Calendar Integration Tools =====
            {
                name: 'sync_assignments_to_calendar',
                description: 'Fetch all assignment deadlines from Moodle and sync them to the calendar. Returns the events that were synced.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        courseIds: { 
                            type: 'array', 
                            items: { type: 'number' },
                            description: 'Optional: specific course IDs to sync. If not provided, syncs all courses.'
                        },
                    },
                },
            },
            {
                name: 'get_assignment_calendar_events',
                description: 'Fetch all assignment deadlines from Moodle and sync them to the calendar. Returns the events that were synced.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        courseIds: { 
                            type: 'array', 
                            items: { type: 'number' },
                            description: 'Optional: specific course IDs to sync. If not provided, syncs all courses.'
                        },
                    },
                },
            },
            {
                name: 'get_assignment_calendar_events',
                description: 'Get assignment deadlines formatted as calendar events without syncing. Useful for previewing what would be added.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        courseIds: { 
                            type: 'array', 
                            items: { type: 'number' },
                            description: 'Optional: specific course IDs. If not provided, gets all courses.'
                        },
                    },
                },
            },
        ],
    }));

    // Tool execution
    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            // ===== Role Management Tools =====
            switch (name) {
                case 'list_roles': {
                    const roles = Object.entries(tokensConfig.roles).map(([id, config]) => ({
                        id,
                        name: config.name,
                        description: config.description || '',
                        isCurrent: id === currentRole,
                    }));
                    return {
                        content: [{
                            type: 'text',
                            text: `Available roles:\n${roles.map(r => `- ${r.id}: ${r.name}${r.isCurrent ? ' (CURRENT)' : ''}`).join('\n')}\n\nUse switch_role to change.`
                        }]
                    };
                }
                case 'get_current_role': {
                    const roleConfig = tokensConfig.roles[currentRole];
                    return {
                        content: [{
                            type: 'text',
                            text: `Currently authenticated as: ${roleConfig.name} (${currentRole})\nUser ID: ${roleConfig.userId}`
                        }]
                    };
                }
                case 'switch_role': {
                    const role = args?.role as string;
                    if (!tokensConfig.roles[role]) {
                        return {
                            content: [{
                                type: 'text',
                                text: `Role "${role}" not found. Available: ${Object.keys(tokensConfig.roles).join(', ')}`
                            }],
                            isError: true
                        };
                    }
                    currentRole = role;
                    const roleConfig = tokensConfig.roles[role];
                    return {
                        content: [{
                            type: 'text',
                            text: `✅ Switched to: ${roleConfig.name} (${role})\nYou are now viewing Moodle as this user.`
                        }]
                    };
                }
                // ===== Moodle Data Tools =====
                case 'get_courses': {
                    const client = getCurrentClient();
                    const courses = await client.getCourses();
                    return { content: [{ type: 'text', text: JSON.stringify(courses, null, 2) }] };
                }
                case 'get_assignments': {
                    const client = getCurrentClient();
                    const courseIds = args?.courseIds as number[];
                    const assignments = await client.getAssignments(courseIds);
                    return { content: [{ type: 'text', text: JSON.stringify(assignments, null, 2) }] };
                }
                case 'get_course_materials': {
                    const client = getCurrentClient();
                    const courseId = args?.courseId as number;
                    const materials = await client.getCourseMaterials(courseId);
                    return { content: [{ type: 'text', text: JSON.stringify(materials, null, 2) }] };
                }
                case 'ask_graphrag': {
                    const question = args?.question as string;
                    const { execSync } = await import('child_process');
                    const scriptPath = join(__dirname, '..', 'suggest_study.py');
                    const result = execSync(`python3 "${scriptPath}" "${question.replace(/"/g, '\\"')}"`).toString();
                    return { content: [{ type: 'text', text: result }] };
                }
                // ===== Calendar Integration Tools =====
                case 'get_assignment_calendar_events': {
                    const client = getCurrentClient();
                    let courseIds = args?.courseIds as number[] | undefined;
                    
                    if (!courseIds || courseIds.length === 0) {
                        const courses = await client.getCourses();
                        courseIds = courses.map((c: any) => c.id);
                    }
                    
                    const assignments = await client.getAssignments(courseIds);
                    const now = Math.floor(Date.now() / 1000);
                    
                    const calendarEvents = assignments
                        .filter((a: any) => a.duedate > now)
                        .map((a: any) => ({
                            id: `moodle-assign-${a.id}`,
                            title: `📚 ${a.courseShortname || a.courseName}: ${a.name}`,
                            start: a.duedate * 1000,
                            end: a.duedate * 1000 + 3600000,
                            description: a.intro?.replace(/<[^>]*>/g, '') || 'Assignment deadline',
                            location: 'Moodle LMS',
                            source: 'moodle',
                            courseId: a.course,
                            courseName: a.courseName || a.courseShortname,
                            assignmentId: a.id,
                            duedate: a.duedate,
                            duedateFormatted: new Date(a.duedate * 1000).toLocaleString()
                        }));
                    
                    return { 
                        content: [{ 
                            type: 'text', 
                            text: JSON.stringify({ count: calendarEvents.length, events: calendarEvents }, null, 2) 
                        }] 
                    };
                }
                case 'sync_assignments_to_calendar': {
                    const client = getCurrentClient();
                    let courseIds = args?.courseIds as number[] | undefined;
                    
                    if (!courseIds || courseIds.length === 0) {
                        const courses = await client.getCourses();
                        courseIds = courses.map((c: any) => c.id);
                    }
                    
                    const assignments = await client.getAssignments(courseIds);
                    const now = Math.floor(Date.now() / 1000);
                    
                    const calendarEvents = assignments
                        .filter((a: any) => a.duedate > now)
                        .map((a: any) => ({
                            id: `moodle-assign-${a.id}`,
                            title: `📚 ${a.courseShortname || a.courseName}: ${a.name}`,
                            start: a.duedate * 1000,
                            end: a.duedate * 1000 + 3600000,
                            description: a.intro?.replace(/<[^>]*>/g, '') || 'Assignment deadline',
                            location: 'Moodle LMS',
                            source: 'moodle',
                            courseId: a.course,
                            courseName: a.courseName || a.courseShortname,
                        }));
                    
                    pendingCalendarEvents = calendarEvents;
                    
                    return { 
                        content: [{ 
                            type: 'text', 
                            text: `✅ Synced ${calendarEvents.length} assignment deadline(s) to calendar!\n\n` +
                                  `Events:\n${calendarEvents.map((e: any) => `• ${e.title} - Due: ${new Date(e.start).toLocaleDateString()}`).join('\n')}\n\n` +
                                  `Calendar applet can fetch from /api/calendar-events`
                        }] 
                    };
                }
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        } catch (error: any) {
            return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
        }
    });

    return mcpServer;
}

// Handle all MCP requests (both GET and POST) on /mcp
app.all('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    // Handle existing session
    if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        await session.transport.handleRequest(req, res, req.body);
        return;
    }
    
    // For new sessions (initialization requests), create new transport and server
    if (req.method === 'POST' && !sessionId) {
        // Create new transport with session ID generator
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
        });
        
        // Create new MCP server
        const mcpServer = createMCPServer();
        
        // Connect server to transport
        await mcpServer.connect(transport);
        
        // Store session after handling the request (to get the session ID)
        transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) {
                sessions.delete(sid);
                console.log(`[MCP] Session closed: ${sid}`);
            }
        };
        
        // Handle the initialization request
        await transport.handleRequest(req, res, req.body);
        
        // Store session for future requests
        const newSessionId = transport.sessionId;
        if (newSessionId) {
            sessions.set(newSessionId, { transport, server: mcpServer });
            console.log(`[MCP] New session created: ${newSessionId}`);
        }
        return;
    }
    
    // Invalid request - session ID required for non-initialization requests
    if (req.method === 'GET' || (req.method === 'POST' && sessionId)) {
        res.status(400).json({ 
            error: 'Bad Request',
            message: sessionId ? 'Session not found' : 'Session ID required for GET requests'
        });
        return;
    }
    
    res.status(405).json({ error: 'Method not allowed' });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        currentRole,
        moodleUrl: tokensConfig.moodleUrl,
        availableRoles: Object.keys(tokensConfig.roles),
        activeSessions: sessions.size,
    });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`\n🚀 Moodle MCP HTTP Server started`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Current Role: ${currentRole} (${tokensConfig.roles[currentRole]?.name})`);
    console.log(`\n📡 Endpoints:`);
    console.log(`   GET  /roles         - List available roles`);
    console.log(`   POST /switch-role   - Switch active role`);
    console.log(`   GET  /current-role  - Get current role`);
    console.log(`   GET  /api/courses   - Get courses (REST API)`);
    console.log(`   POST /api/assignments - Get assignments (REST API)`);
    console.log(`   ALL  /mcp           - MCP Streamable HTTP endpoint`);
    console.log(`   GET  /health        - Health check`);
});
