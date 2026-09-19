import type {
    Blockquote,
    Code,
    Heading,
    InlineCode,
    Link,
    List,
    ListItem,
    Paragraph,
    Strong,
    Table,
    TableCell,
    TableRow,
    Text,
} from 'mdast';

/**
 * Creates a plain text mdast node.
 *
 * @param value - Text content.
 * @returns Text node.
 */
export const text = (value: string): Text => ({ type: 'text', value });

/**
 * Creates a paragraph mdast node.
 *
 * @param children - Inline children of the paragraph.
 * @returns Paragraph node.
 */
export const paragraph = (children: Paragraph['children']): Paragraph => ({
    type: 'paragraph',
    children,
});

/**
 * Creates a code-block mdast node.
 *
 * @param value - Code content.
 * @returns Code node.
 */
export const code = (value: string): Code => ({ type: 'code', value });

/**
 * Creates a blockquote mdast node.
 *
 * @param children - Quoted block children.
 * @returns Blockquote node.
 */
export const blockquote = (children: Blockquote['children']): Blockquote => ({
    type: 'blockquote',
    children,
});

/**
 * Creates a heading mdast node with plain-text content.
 *
 * @param depth - Heading depth (1-6).
 * @param value - Heading text.
 * @returns Heading node.
 */
export const heading = (depth: Heading['depth'], value: string): Heading => ({
    type: 'heading',
    depth,
    children: [text(value)],
});

/**
 * Creates a strong (bold) mdast node with plain-text content.
 *
 * @param value - Bold text.
 * @returns Strong node.
 */
export const strong = (value: string): Strong => ({
    type: 'strong',
    children: [text(value)],
});

/**
 * Creates an inline-code mdast node.
 *
 * @param value - Code content.
 * @returns InlineCode node.
 */
export const inlineCode = (value: string): InlineCode => ({
    type: 'inlineCode',
    value,
});

/**
 * Creates a link mdast node with plain-text label.
 *
 * @param url - Link target.
 * @param value - Link label.
 * @returns Link node.
 */
export const link = (url: string, value: string): Link => ({
    type: 'link',
    url,
    children: [text(value)],
});

/**
 * Creates an unordered list mdast node.
 *
 * @param children - List items.
 * @returns List node.
 */
export const list = (children: ListItem[]): List => ({
    type: 'list',
    ordered: false,
    spread: false,
    children,
});

/**
 * Creates a list-item mdast node.
 *
 * @param children - Item block children.
 * @returns ListItem node.
 */
export const listItem = (children: ListItem['children']): ListItem => ({
    type: 'listItem',
    children,
});

/**
 * Creates a table mdast node.
 *
 * @param children - Table rows.
 * @returns Table node.
 */
export const table = (children: TableRow[]): Table => ({
    type: 'table',
    align: [],
    children,
});

/**
 * Creates a table-row mdast node.
 *
 * @param children - Row cells.
 * @returns TableRow node.
 */
export const tableRow = (children: TableCell[]): TableRow => ({
    type: 'tableRow',
    children,
});

/**
 * Creates a table-cell mdast node.
 *
 * @param children - Cell inline children.
 * @returns TableCell node.
 */
export const tableCell = (children: TableCell['children']): TableCell => ({
    type: 'tableCell',
    children,
});
