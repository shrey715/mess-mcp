/**
 * Type definitions for Moodle MCP API
 */

export interface MoodleConfig {
    baseUrl: string;
    token: string;
}

export interface Course {
    id: number;
    shortname: string;
    fullname: string;
    displayname: string;
    summary: string;
    categoryid: number;
    visible: number;
    format: string;
    startdate: number;
    enddate: number;
}

export interface Assignment {
    id: number;
    course: number;
    name: string;
    intro: string;
    introformat: number;
    duedate: number;
    cutoffdate: number;
    allowsubmissionsfromdate: number;
    grade: number;
    timemodified: number;
}

export interface CourseModule {
    id: number;
    url?: string;
    name: string;
    instance: number;
    contextid: number;
    visible: number;
    uservisible: boolean;
    modname: string;
    contents?: ModuleContent[];
}

export interface ModuleContent {
    type: string;
    filename: string;
    filepath: string;
    filesize: number;
    fileurl: string;
    timecreated: number;
    timemodified: number;
    mimetype: string;
}

export interface CourseSection {
    id: number;
    name: string;
    visible: number;
    summary: string;
    section: number;
    uservisible: boolean;
    modules: CourseModule[];
}

export interface TextChunk {
    id: string;
    content: string;
    metadata: ChunkMetadata;
    embedding?: number[];
}

export interface ChunkMetadata {
    source: string;
    courseId?: number;
    courseName?: string;
    chunkIndex: number;
    totalChunks: number;
    wordCount: number;
    charCount: number;
}
