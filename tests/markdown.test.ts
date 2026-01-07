// tests/markdown.test.ts
// Unit tests for markdown conversion utilities

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { convertDocsJsonToMarkdown } from '../src/helpers/markdown.js';

describe('convertDocsJsonToMarkdown', () => {

  it('should return empty message for empty document', () => {
    const result = convertDocsJsonToMarkdown({});
    assert.strictEqual(result, 'Document appears to be empty.');
  });

  it('should return empty message for document without body', () => {
    const result = convertDocsJsonToMarkdown({ title: 'Test' });
    assert.strictEqual(result, 'Document appears to be empty.');
  });

  it('should convert simple paragraph to text', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              elements: [
                { textRun: { content: 'Hello World' } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, 'Hello World');
  });

  it('should convert heading to markdown heading', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              paragraphStyle: { namedStyleType: 'HEADING_1' },
              elements: [
                { textRun: { content: 'Main Title' } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '# Main Title');
  });

  it('should convert HEADING_2 to ## heading', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              paragraphStyle: { namedStyleType: 'HEADING_2' },
              elements: [
                { textRun: { content: 'Subtitle' } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '## Subtitle');
  });

  it('should convert TITLE to # heading', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              paragraphStyle: { namedStyleType: 'TITLE' },
              elements: [
                { textRun: { content: 'Document Title' } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '# Document Title');
  });

  it('should convert bold text', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              elements: [
                { textRun: { content: 'Bold Text', textStyle: { bold: true } } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '**Bold Text**');
  });

  it('should convert italic text', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              elements: [
                { textRun: { content: 'Italic Text', textStyle: { italic: true } } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '*Italic Text*');
  });

  it('should convert bold+italic text', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              elements: [
                { textRun: { content: 'Bold Italic', textStyle: { bold: true, italic: true } } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '***Bold Italic***');
  });

  it('should convert strikethrough text', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              elements: [
                { textRun: { content: 'Deleted', textStyle: { strikethrough: true } } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '~~Deleted~~');
  });

  it('should convert links', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              elements: [
                {
                  textRun: {
                    content: 'Click here',
                    textStyle: { link: { url: 'https://example.com' } }
                  }
                }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '[Click here](https://example.com)');
  });

  it('should convert bullet list', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              bullet: {},
              elements: [
                { textRun: { content: 'List item 1' } }
              ]
            }
          },
          {
            paragraph: {
              bullet: {},
              elements: [
                { textRun: { content: 'List item 2' } }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.strictEqual(result, '- List item 1\n- List item 2');
  });

  it('should convert section break to horizontal rule', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: 'Before' } }]
            }
          },
          { sectionBreak: {} },
          {
            paragraph: {
              elements: [{ textRun: { content: 'After' } }]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.ok(result.includes('---'));
  });

  it('should convert simple table', () => {
    const docData = {
      body: {
        content: [
          {
            table: {
              tableRows: [
                {
                  tableCells: [
                    { content: [{ paragraph: { elements: [{ textRun: { content: 'Header 1' } }] } }] },
                    { content: [{ paragraph: { elements: [{ textRun: { content: 'Header 2' } }] } }] }
                  ]
                },
                {
                  tableCells: [
                    { content: [{ paragraph: { elements: [{ textRun: { content: 'Cell 1' } }] } }] },
                    { content: [{ paragraph: { elements: [{ textRun: { content: 'Cell 2' } }] } }] }
                  ]
                }
              ]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.ok(result.includes('| Header 1 | Header 2 |'));
    assert.ok(result.includes('| --- | --- |'));
    assert.ok(result.includes('| Cell 1 | Cell 2 |'));
  });

  it('should handle multiple paragraphs', () => {
    const docData = {
      body: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: 'First paragraph' } }]
            }
          },
          {
            paragraph: {
              elements: [{ textRun: { content: 'Second paragraph' } }]
            }
          }
        ]
      }
    };
    const result = convertDocsJsonToMarkdown(docData);
    assert.ok(result.includes('First paragraph'));
    assert.ok(result.includes('Second paragraph'));
  });

});
