import {
    blockquote,
    code,
    heading,
    inlineCode,
    link,
    list,
    listItem,
    paragraph,
    strong,
    table,
    tableCell,
    tableRow,
    text,
} from '@/src/markdown/tags';

describe('markdown tags', () => {
    it('creates a text node', () => {
        expect(text('hello')).toEqual({ type: 'text', value: 'hello' });
    });

    it('creates a paragraph node from children', () => {
        expect(paragraph([text('hello')])).toEqual({
            type: 'paragraph',
            children: [{ type: 'text', value: 'hello' }],
        });
    });

    it('creates a code node', () => {
        expect(code('console.log(1)')).toEqual({
            type: 'code',
            value: 'console.log(1)',
        });
    });

    it('creates a blockquote node from children', () => {
        expect(blockquote([paragraph([text('quoted')])])).toEqual({
            type: 'blockquote',
            children: [
                {
                    type: 'paragraph',
                    children: [{ type: 'text', value: 'quoted' }],
                },
            ],
        });
    });

    it('creates a heading node with the given depth', () => {
        expect(heading(2, 'Title')).toEqual({
            type: 'heading',
            depth: 2,
            children: [{ type: 'text', value: 'Title' }],
        });
    });

    it('creates a strong node', () => {
        expect(strong('bold')).toEqual({
            type: 'strong',
            children: [{ type: 'text', value: 'bold' }],
        });
    });

    it('creates an inline code node', () => {
        expect(inlineCode('R-1')).toEqual({
            type: 'inlineCode',
            value: 'R-1',
        });
    });

    it('creates a link node', () => {
        expect(link('https://example.com', 'Example')).toEqual({
            type: 'link',
            url: 'https://example.com',
            children: [{ type: 'text', value: 'Example' }],
        });
    });

    it('creates an unordered list node from items', () => {
        expect(list([listItem([paragraph([text('one')])])])).toEqual({
            type: 'list',
            ordered: false,
            spread: false,
            children: [
                {
                    type: 'listItem',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: 'one' }],
                        },
                    ],
                },
            ],
        });
    });

    it('creates a table node with rows', () => {
        expect(
            table([
                tableRow([
                    tableCell([text('Step')]),
                    tableCell([text('Status')]),
                ]),
            ]),
        ).toEqual({
            type: 'table',
            align: [],
            children: [
                {
                    type: 'tableRow',
                    children: [
                        {
                            type: 'tableCell',
                            children: [{ type: 'text', value: 'Step' }],
                        },
                        {
                            type: 'tableCell',
                            children: [{ type: 'text', value: 'Status' }],
                        },
                    ],
                },
            ],
        });
    });
});
