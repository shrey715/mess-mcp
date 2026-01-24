import axios, { AxiosInstance } from 'axios';
import { MoodleConfig, Course, Assignment, CourseSection, ModuleContent } from './types';

/**
 * Moodle MCP Client
 * 
 * TypeScript client for Moodle using the standard REST API.
 */
export class MoodleMCPClient {
    private baseUrl: string;
    private token: string;

    constructor(private config: MoodleConfig) {
        // Extract base URL (remove any /webservice/mcp/server.php suffix)
        this.baseUrl = config.baseUrl.replace(/\/webservice\/.*$/, '');
        this.token = config.token;
    }

    /**
     * Call Moodle's standard REST API
     */
    private async call<T>(wsfunction: string, params: Record<string, any> = {}): Promise<T> {
        const url = `${this.baseUrl}/webservice/rest/server.php`;
        const queryParams = new URLSearchParams({
            wstoken: this.token,
            wsfunction: wsfunction,
            moodlewsrestformat: 'json',
            ...Object.fromEntries(
                Object.entries(params).map(([k, v]) => [k, String(v)])
            )
        });

        const response = await axios.get(`${url}?${queryParams.toString()}`, { timeout: 30000 });

        if (response.data?.exception) {
            throw new Error(`Moodle Error: ${response.data.message}`);
        }

        return response.data as T;
    }

    async listTools(): Promise<any> {
        return {
            tools: [
                { name: 'core_enrol_get_users_courses', description: 'Get enrolled courses' },
                { name: 'core_course_get_contents', description: 'Get course contents' },
                { name: 'mod_assign_get_assignments', description: 'Get assignments' },
            ]
        };
    }

    /**
     * Get the current user's ID from site info
     */
    async getUserId(): Promise<number> {
        const siteInfo = await this.call<any>('core_webservice_get_site_info');
        return siteInfo.userid;
    }

    async getCourses(): Promise<Course[]> {
        // Get current user's ID first
        const userId = await this.getUserId();
        // Use core_enrol_get_users_courses which works for students
        const courses = await this.call<Course[]>('core_enrol_get_users_courses', { userid: userId });
        return courses;
    }

    async getCourseContents(courseId: number): Promise<CourseSection[]> {
        return this.call<CourseSection[]>('core_course_get_contents', { courseid: courseId });
    }

    async getAssignments(courseIds: number[]): Promise<any[]> {
        const url = `${this.baseUrl}/webservice/rest/server.php`;
        
        // Build query string manually to handle array parameters correctly
        const queryParts = [
            `wstoken=${encodeURIComponent(this.token)}`,
            `wsfunction=mod_assign_get_assignments`,
            `moodlewsrestformat=json`,
        ];
        
        // Add courseids as array parameters
        courseIds.forEach((id, i) => {
            queryParts.push(`courseids[${i}]=${id}`);
        });

        const fullUrl = `${url}?${queryParts.join('&')}`;
        const response = await axios.get(fullUrl, { timeout: 30000 });

        if (response.data?.exception) {
            throw new Error(`Moodle Error: ${response.data.message}`);
        }

        // Extract assignments from all courses
        if (response.data?.courses && Array.isArray(response.data.courses)) {
            const assignments: any[] = [];
            for (const course of response.data.courses) {
                if (course.assignments && course.assignments.length > 0) {
                    for (const assign of course.assignments) {
                        assignments.push({
                            ...assign,
                            courseName: course.fullname,
                            courseShortname: course.shortname,
                        });
                    }
                }
            }
            return assignments;
        }
        return [];
    }

    async getCourseMaterials(courseId: number): Promise<ModuleContent[]> {
        const sections = await this.getCourseContents(courseId);
        const materials: ModuleContent[] = [];
        for (const section of sections) {
            for (const module of section.modules) {
                if (module.contents) materials.push(...module.contents);
            }
        }
        return materials;
    }

    async getCoursePDFs(courseId: number): Promise<ModuleContent[]> {
        const materials = await this.getCourseMaterials(courseId);
        return materials.filter(m => m.mimetype === 'application/pdf');
    }

    async downloadFile(fileUrl: string): Promise<Buffer> {
        const url = fileUrl.includes('token=')
            ? fileUrl : `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${this.token}`;
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
        return Buffer.from(response.data);
    }

    async getSiteInfo(): Promise<any> {
        return this.call<any>('core_webservice_get_site_info');
    }
}

export * from './types';
