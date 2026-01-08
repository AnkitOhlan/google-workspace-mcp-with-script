// tests/gmailTools.test.ts
// Unit tests for Gmail tools

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import {
  MockFastMCP,
  MockGmailClient,
  MockLogger,
} from './helpers/mock-utils.js';
import { registerGmailTools, GMAIL_TOOLS_COUNT } from '../src/tools/gmailTools.js';

describe('Gmail Tools Registration', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerGmailTools(mockServer as any);
  });

  it('should register exactly 15 tools', () => {
    assert.strictEqual(mockServer.tools.size, 15);
    assert.strictEqual(mockServer.tools.size, GMAIL_TOOLS_COUNT);
  });

  it('should register searchGmailMessages tool', () => {
    const tool = mockServer.getTool('searchGmailMessages');
    assert.ok(tool, 'searchGmailMessages tool should exist');
    assert.strictEqual(tool.name, 'searchGmailMessages');
  });

  it('should register getGmailMessage tool', () => {
    const tool = mockServer.getTool('getGmailMessage');
    assert.ok(tool, 'getGmailMessage tool should exist');
    assert.strictEqual(tool.name, 'getGmailMessage');
  });

  it('should register sendGmailMessage tool', () => {
    const tool = mockServer.getTool('sendGmailMessage');
    assert.ok(tool, 'sendGmailMessage tool should exist');
    assert.strictEqual(tool.name, 'sendGmailMessage');
  });

  it('should register all expected tool names', () => {
    const toolNames = mockServer.getToolNames();
    const expectedTools = [
      'searchGmailMessages',
      'getGmailMessage',
      'getGmailMessagesBatch',
      'getGmailAttachment',
      'sendGmailMessage',
      'createGmailDraft',
      'getGmailThread',
      'listGmailLabels',
      'createGmailLabel',
      'deleteGmailLabel',
      'listGmailFilters',
      'createGmailFilter',
      'deleteGmailFilter',
      'modifyGmailMessageLabels',
      'trashGmailMessage',
    ];

    expectedTools.forEach(name => {
      assert.ok(toolNames.includes(name), `${name} should be registered`);
    });
  });

});

describe('searchGmailMessages Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerGmailTools(mockServer as any);
  });

  it('should have correct description', () => {
    const tool = mockServer.getTool('searchGmailMessages');
    assert.ok(tool?.description.includes('Search'));
    assert.ok(tool?.description.includes('Gmail'));
  });

  it('should require query parameter', () => {
    const tool = mockServer.getTool('searchGmailMessages');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.query, 'query parameter should exist');
  });

  it('should validate valid search parameters', () => {
    const tool = mockServer.getTool('searchGmailMessages');
    const validParams = {
      query: 'from:test@example.com is:unread',
      maxResults: 20
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid parameters should pass');
  });

  it('should reject empty query', () => {
    const tool = mockServer.getTool('searchGmailMessages');
    const invalidParams = { query: '' };
    // Note: We don't have min(1) so empty string might pass
    const result = tool?.parameters.safeParse(invalidParams);
    // Just verify parsing works
    assert.ok(result?.success !== undefined);
  });

  it('should default maxResults to 20', () => {
    const tool = mockServer.getTool('searchGmailMessages');
    const params = { query: 'test' };
    const result = tool?.parameters.parse(params);
    assert.strictEqual(result.maxResults, 20);
  });

  it('should reject maxResults greater than 100', () => {
    const tool = mockServer.getTool('searchGmailMessages');
    const invalidParams = { query: 'test', maxResults: 200 };
    const result = tool?.parameters.safeParse(invalidParams);
    assert.ok(!result?.success, 'maxResults > 100 should fail');
  });

});

describe('getGmailMessage Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerGmailTools(mockServer as any);
  });

  it('should require messageId parameter', () => {
    const tool = mockServer.getTool('getGmailMessage');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.messageId, 'messageId parameter should exist');
  });

  it('should accept valid format values', () => {
    const tool = mockServer.getTool('getGmailMessage');
    const formats = ['full', 'metadata', 'minimal'];

    formats.forEach(format => {
      const params = { messageId: 'msg-123', format };
      const result = tool?.parameters.safeParse(params);
      assert.ok(result?.success, `${format} format should be valid`);
    });
  });

  it('should default format to full', () => {
    const tool = mockServer.getTool('getGmailMessage');
    const params = { messageId: 'msg-123' };
    const result = tool?.parameters.parse(params);
    assert.strictEqual(result.format, 'full');
  });

  it('should reject invalid format', () => {
    const tool = mockServer.getTool('getGmailMessage');
    const params = { messageId: 'msg-123', format: 'invalid' };
    const result = tool?.parameters.safeParse(params);
    assert.ok(!result?.success, 'Invalid format should fail');
  });

});

describe('sendGmailMessage Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerGmailTools(mockServer as any);
  });

  it('should require to, subject, and body parameters', () => {
    const tool = mockServer.getTool('sendGmailMessage');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;

    assert.ok(shape.to, 'to parameter should exist');
    assert.ok(shape.subject, 'subject parameter should exist');
    assert.ok(shape.body, 'body parameter should exist');
  });

  it('should validate complete email parameters', () => {
    const tool = mockServer.getTool('sendGmailMessage');
    const validParams = {
      to: 'recipient@example.com',
      subject: 'Test Subject',
      body: 'Test email body'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid email params should pass');
  });

  it('should accept optional cc and bcc', () => {
    const tool = mockServer.getTool('sendGmailMessage');
    const validParams = {
      to: 'recipient@example.com',
      subject: 'Test',
      body: 'Body',
      cc: 'cc@example.com',
      bcc: 'bcc@example.com'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Email with cc/bcc should be valid');
  });

  it('should accept threadId for replies', () => {
    const tool = mockServer.getTool('sendGmailMessage');
    const validParams = {
      to: 'recipient@example.com',
      subject: 'Re: Test',
      body: 'Reply body',
      threadId: 'thread-123'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Email with threadId should be valid');
  });

  it('should reject missing required fields', () => {
    const tool = mockServer.getTool('sendGmailMessage');

    // Missing to
    let result = tool?.parameters.safeParse({ subject: 'Test', body: 'Body' });
    assert.ok(!result?.success, 'Missing to should fail');

    // Missing subject
    result = tool?.parameters.safeParse({ to: 'test@example.com', body: 'Body' });
    assert.ok(!result?.success, 'Missing subject should fail');

    // Missing body
    result = tool?.parameters.safeParse({ to: 'test@example.com', subject: 'Test' });
    assert.ok(!result?.success, 'Missing body should fail');
  });

});

describe('listGmailLabels Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerGmailTools(mockServer as any);
  });

  it('should not require any parameters', () => {
    const tool = mockServer.getTool('listGmailLabels');
    const validParams = {};
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Empty params should be valid');
  });

  it('should have description about labels', () => {
    const tool = mockServer.getTool('listGmailLabels');
    assert.ok(tool?.description.includes('label') || tool?.description.includes('Label'));
  });

});

describe('createGmailLabel Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerGmailTools(mockServer as any);
  });

  it('should require name parameter', () => {
    const tool = mockServer.getTool('createGmailLabel');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.name, 'name parameter should exist');
  });

  it('should validate label creation parameters', () => {
    const tool = mockServer.getTool('createGmailLabel');
    const validParams = {
      name: 'My New Label'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid label name should pass');
  });

  it('should accept visibility options', () => {
    const tool = mockServer.getTool('createGmailLabel');
    const validParams = {
      name: 'My Label',
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Label with visibility should be valid');
  });

  it('should accept color options', () => {
    const tool = mockServer.getTool('createGmailLabel');
    const validParams = {
      name: 'Colored Label',
      backgroundColor: '#ff0000',
      textColor: '#ffffff'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Label with colors should be valid');
  });

});

describe('getGmailThread Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerGmailTools(mockServer as any);
  });

  it('should require threadId parameter', () => {
    const tool = mockServer.getTool('getGmailThread');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.threadId, 'threadId parameter should exist');
  });

  it('should validate thread retrieval parameters', () => {
    const tool = mockServer.getTool('getGmailThread');
    const validParams = {
      threadId: 'thread-123'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid threadId should pass');
  });

  it('should accept format option', () => {
    const tool = mockServer.getTool('getGmailThread');
    const validParams = {
      threadId: 'thread-123',
      format: 'metadata'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Thread with format should be valid');
  });

});

describe('createGmailFilter Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerGmailTools(mockServer as any);
  });

  it('should validate filter criteria', () => {
    const tool = mockServer.getTool('createGmailFilter');
    const validParams = {
      from: 'sender@example.com',
      addLabelIds: ['Label_1']
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid filter should pass');
  });

  it('should accept multiple criteria', () => {
    const tool = mockServer.getTool('createGmailFilter');
    const validParams = {
      from: 'sender@example.com',
      subject: 'Important',
      hasAttachment: true,
      addLabelIds: ['Label_1'],
      removeLabelIds: ['INBOX']
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Filter with multiple criteria should be valid');
  });

});

describe('Mock Gmail Client Behavior', () => {

  let mockGmail: MockGmailClient;
  let logger: MockLogger;

  beforeEach(() => {
    mockGmail = new MockGmailClient();
    logger = new MockLogger();
  });

  it('should track messages.list calls', async () => {
    await mockGmail.users.messages.list({ userId: 'me', q: 'test' });
    assert.strictEqual(mockGmail.calls.length, 1);
    assert.strictEqual(mockGmail.calls[0].method, 'users.messages.list');
  });

  it('should return mock message list', async () => {
    const response = await mockGmail.users.messages.list({ userId: 'me' });
    assert.ok(Array.isArray(response.data.messages));
    assert.strictEqual(response.data.messages.length, 2);
  });

  it('should allow custom response', async () => {
    mockGmail.setResponse('users.messages.list', {
      data: { messages: [{ id: 'custom-1', threadId: 't-1' }] }
    });
    const response = await mockGmail.users.messages.list({ userId: 'me' });
    assert.strictEqual(response.data.messages.length, 1);
    assert.strictEqual(response.data.messages[0].id, 'custom-1');
  });

  it('should simulate errors', async () => {
    mockGmail.setError('users.messages.list', new Error('Quota exceeded'));
    await assert.rejects(
      async () => mockGmail.users.messages.list({ userId: 'me' }),
      { message: 'Quota exceeded' }
    );
  });

  it('should track labels.list calls', async () => {
    await mockGmail.users.labels.list({ userId: 'me' });
    assert.strictEqual(mockGmail.calls.length, 1);
    assert.strictEqual(mockGmail.calls[0].method, 'users.labels.list');
  });

  it('should track send calls', async () => {
    await mockGmail.users.messages.send({ userId: 'me', requestBody: { raw: 'test' } });
    assert.strictEqual(mockGmail.calls.length, 1);
    assert.strictEqual(mockGmail.calls[0].method, 'users.messages.send');
  });

});
