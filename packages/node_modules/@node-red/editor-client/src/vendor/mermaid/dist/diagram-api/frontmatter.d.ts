import { DiagramDb } from './types';
export declare const frontMatterRegex: RegExp;
/**
 * Extract and parse frontmatter from text, if present, and sets appropriate
 * properties in the provided db.
 * @param text - The text that may have a YAML frontmatter.
 * @param db - Diagram database, could be of any diagram.
 * @returns text with frontmatter stripped out
 */
export declare function extractFrontMatter(text: string, db: DiagramDb): string;
