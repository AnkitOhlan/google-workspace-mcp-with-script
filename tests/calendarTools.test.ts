// tests/calendarTools.test.ts
// Unit tests for Calendar tools

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import {
  MockFastMCP,
  MockCalendarClient,
  MockLogger,
} from './helpers/mock-utils.js';
import { registerCalendarTools, CALENDAR_TOOLS_COUNT } from '../src/tools/calendarTools.js';

describe('Calendar Tools Registration', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerCalendarTools(mockServer as any);
  });

  it('should register exactly 8 tools', () => {
    assert.strictEqual(mockServer.tools.size, 8);
    assert.strictEqual(mockServer.tools.size, CALENDAR_TOOLS_COUNT);
  });

  it('should register listCalendars tool', () => {
    const tool = mockServer.getTool('listCalendars');
    assert.ok(tool, 'listCalendars tool should exist');
    assert.strictEqual(tool.name, 'listCalendars');
  });

  it('should register getCalendarEvents tool', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    assert.ok(tool, 'getCalendarEvents tool should exist');
    assert.strictEqual(tool.name, 'getCalendarEvents');
  });

  it('should register createCalendarEvent tool', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    assert.ok(tool, 'createCalendarEvent tool should exist');
    assert.strictEqual(tool.name, 'createCalendarEvent');
  });

  it('should register all expected tool names', () => {
    const toolNames = mockServer.getToolNames();
    const expectedTools = [
      'listCalendars',
      'getCalendarEvents',
      'getCalendarEvent',
      'createCalendarEvent',
      'updateCalendarEvent',
      'deleteCalendarEvent',
      'quickAddCalendarEvent',
      'getCalendarFreeBusy',
    ];

    expectedTools.forEach(name => {
      assert.ok(toolNames.includes(name), `${name} should be registered`);
    });
  });

});

describe('listCalendars Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerCalendarTools(mockServer as any);
  });

  it('should have correct description', () => {
    const tool = mockServer.getTool('listCalendars');
    assert.ok(tool?.description.includes('calendar') || tool?.description.includes('Calendar'));
  });

  it('should have optional showHidden parameter', () => {
    const tool = mockServer.getTool('listCalendars');
    const validParams = {}; // showHidden is optional
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Empty params should be valid');
  });

  it('should default showHidden to false', () => {
    const tool = mockServer.getTool('listCalendars');
    const params = {};
    const result = tool?.parameters.parse(params);
    assert.strictEqual(result.showHidden, false);
  });

  it('should accept showHidden parameter', () => {
    const tool = mockServer.getTool('listCalendars');
    const validParams = { showHidden: true };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'showHidden=true should be valid');
  });

});

describe('getCalendarEvents Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerCalendarTools(mockServer as any);
  });

  it('should have optional calendarId parameter', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    const validParams = {};
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Empty params should be valid');
  });

  it('should default calendarId to primary', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    const params = {};
    const result = tool?.parameters.parse(params);
    assert.strictEqual(result.calendarId, 'primary');
  });

  it('should accept time range parameters', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    const validParams = {
      timeMin: '2024-01-01T00:00:00Z',
      timeMax: '2024-01-31T23:59:59Z'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Time range should be valid');
  });

  it('should accept query parameter', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    const validParams = {
      query: 'meeting'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Query should be valid');
  });

  it('should accept orderBy parameter', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    const orderByValues = ['startTime', 'updated'];

    orderByValues.forEach(orderBy => {
      const params = { orderBy };
      const result = tool?.parameters.safeParse(params);
      assert.ok(result?.success, `${orderBy} should be valid orderBy`);
    });
  });

  it('should reject invalid orderBy', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    const params = { orderBy: 'invalid' };
    const result = tool?.parameters.safeParse(params);
    assert.ok(!result?.success, 'Invalid orderBy should fail');
  });

  it('should accept maxResults in valid range', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    const validParams = { maxResults: 100 };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'maxResults 100 should be valid');
  });

  it('should reject maxResults greater than 250', () => {
    const tool = mockServer.getTool('getCalendarEvents');
    const invalidParams = { maxResults: 300 };
    const result = tool?.parameters.safeParse(invalidParams);
    assert.ok(!result?.success, 'maxResults > 250 should fail');
  });

});

describe('createCalendarEvent Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerCalendarTools(mockServer as any);
  });

  it('should require summary parameter', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.summary, 'summary parameter should exist');
  });

  it('should require start parameter', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.start, 'start parameter should exist');
  });

  it('should require end parameter', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.end, 'end parameter should exist');
  });

  it('should validate complete event parameters', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const validParams = {
      summary: 'Test Meeting',
      start: { dateTime: '2024-01-15T09:00:00Z' },
      end: { dateTime: '2024-01-15T10:00:00Z' }
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid event params should pass');
  });

  it('should accept all-day event format', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const validParams = {
      summary: 'All Day Event',
      start: { date: '2024-01-15' },
      end: { date: '2024-01-16' }
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'All-day event should be valid');
  });

  it('should accept attendees array', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const validParams = {
      summary: 'Team Meeting',
      start: { dateTime: '2024-01-15T09:00:00Z' },
      end: { dateTime: '2024-01-15T10:00:00Z' },
      attendees: ['person1@example.com', 'person2@example.com']
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Event with attendees should be valid');
  });

  it('should accept Google Meet option', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const validParams = {
      summary: 'Video Meeting',
      start: { dateTime: '2024-01-15T09:00:00Z' },
      end: { dateTime: '2024-01-15T10:00:00Z' },
      conferenceType: 'hangoutsMeet'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Event with Meet should be valid');
  });

  it('should accept recurrence rules', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const validParams = {
      summary: 'Weekly Meeting',
      start: { dateTime: '2024-01-15T09:00:00Z' },
      end: { dateTime: '2024-01-15T10:00:00Z' },
      recurrence: ['RRULE:FREQ=WEEKLY;COUNT=10']
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Recurring event should be valid');
  });

  it('should accept visibility option', () => {
    const tool = mockServer.getTool('createCalendarEvent');
    const visibilities = ['default', 'public', 'private', 'confidential'];

    visibilities.forEach(visibility => {
      const params = {
        summary: 'Test',
        start: { dateTime: '2024-01-15T09:00:00Z' },
        end: { dateTime: '2024-01-15T10:00:00Z' },
        visibility
      };
      const result = tool?.parameters.safeParse(params);
      assert.ok(result?.success, `${visibility} visibility should be valid`);
    });
  });

});

describe('updateCalendarEvent Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerCalendarTools(mockServer as any);
  });

  it('should require eventId parameter', () => {
    const tool = mockServer.getTool('updateCalendarEvent');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.eventId, 'eventId parameter should exist');
  });

  it('should validate update parameters', () => {
    const tool = mockServer.getTool('updateCalendarEvent');
    const validParams = {
      eventId: 'event-123',
      summary: 'Updated Title'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid update should pass');
  });

  it('should accept partial updates', () => {
    const tool = mockServer.getTool('updateCalendarEvent');
    const validParams = {
      eventId: 'event-123',
      location: 'New Location'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Partial update should be valid');
  });

  it('should accept sendUpdates option', () => {
    const tool = mockServer.getTool('updateCalendarEvent');
    const sendUpdatesValues = ['all', 'externalOnly', 'none'];

    sendUpdatesValues.forEach(sendUpdates => {
      const params = {
        eventId: 'event-123',
        summary: 'Updated',
        sendUpdates
      };
      const result = tool?.parameters.safeParse(params);
      assert.ok(result?.success, `${sendUpdates} should be valid sendUpdates`);
    });
  });

});

describe('deleteCalendarEvent Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerCalendarTools(mockServer as any);
  });

  it('should require eventId parameter', () => {
    const tool = mockServer.getTool('deleteCalendarEvent');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.eventId, 'eventId parameter should exist');
  });

  it('should validate delete parameters', () => {
    const tool = mockServer.getTool('deleteCalendarEvent');
    const validParams = {
      eventId: 'event-123'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid eventId should pass');
  });

  it('should accept sendUpdates option', () => {
    const tool = mockServer.getTool('deleteCalendarEvent');
    const validParams = {
      eventId: 'event-123',
      sendUpdates: 'all'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Delete with sendUpdates should be valid');
  });

});

describe('quickAddCalendarEvent Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerCalendarTools(mockServer as any);
  });

  it('should require text parameter', () => {
    const tool = mockServer.getTool('quickAddCalendarEvent');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.text, 'text parameter should exist');
  });

  it('should validate quick add parameters', () => {
    const tool = mockServer.getTool('quickAddCalendarEvent');
    const validParams = {
      text: 'Lunch with John next Friday at 12pm'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Natural language text should pass');
  });

  it('should have description about natural language', () => {
    const tool = mockServer.getTool('quickAddCalendarEvent');
    assert.ok(tool?.description.includes('natural language') || tool?.description.includes('Quick'));
  });

});

describe('getCalendarFreeBusy Tool', () => {

  let mockServer: MockFastMCP;

  beforeEach(() => {
    mockServer = new MockFastMCP();
    registerCalendarTools(mockServer as any);
  });

  it('should require timeMin parameter', () => {
    const tool = mockServer.getTool('getCalendarFreeBusy');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.timeMin, 'timeMin parameter should exist');
  });

  it('should require timeMax parameter', () => {
    const tool = mockServer.getTool('getCalendarFreeBusy');
    const schema = tool?.parameters as z.ZodObject<any>;
    const shape = schema.shape;
    assert.ok(shape.timeMax, 'timeMax parameter should exist');
  });

  it('should validate free/busy parameters', () => {
    const tool = mockServer.getTool('getCalendarFreeBusy');
    const validParams = {
      timeMin: '2024-01-15T00:00:00Z',
      timeMax: '2024-01-15T23:59:59Z'
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Valid time range should pass');
  });

  it('should accept calendarIds array', () => {
    const tool = mockServer.getTool('getCalendarFreeBusy');
    const validParams = {
      timeMin: '2024-01-15T00:00:00Z',
      timeMax: '2024-01-15T23:59:59Z',
      calendarIds: ['primary', 'work@example.com']
    };
    const result = tool?.parameters.safeParse(validParams);
    assert.ok(result?.success, 'Multiple calendars should be valid');
  });

});

describe('Mock Calendar Client Behavior', () => {

  let mockCalendar: MockCalendarClient;
  let logger: MockLogger;

  beforeEach(() => {
    mockCalendar = new MockCalendarClient();
    logger = new MockLogger();
  });

  it('should track calendarList.list calls', async () => {
    await mockCalendar.calendarList.list({});
    assert.strictEqual(mockCalendar.calls.length, 1);
    assert.strictEqual(mockCalendar.calls[0].method, 'calendarList.list');
  });

  it('should return mock calendar list', async () => {
    const response = await mockCalendar.calendarList.list({});
    assert.ok(Array.isArray(response.data.items));
    assert.strictEqual(response.data.items.length, 2);
  });

  it('should track events.list calls', async () => {
    await mockCalendar.events.list({ calendarId: 'primary' });
    assert.strictEqual(mockCalendar.calls.length, 1);
    assert.strictEqual(mockCalendar.calls[0].method, 'events.list');
  });

  it('should return mock events list', async () => {
    const response = await mockCalendar.events.list({ calendarId: 'primary' });
    assert.ok(Array.isArray(response.data.items));
    assert.strictEqual(response.data.items.length, 1);
    assert.strictEqual(response.data.items[0].summary, 'Test Meeting');
  });

  it('should allow custom response', async () => {
    mockCalendar.setResponse('events.list', {
      data: { items: [] }
    });
    const response = await mockCalendar.events.list({ calendarId: 'primary' });
    assert.strictEqual(response.data.items.length, 0);
  });

  it('should simulate errors', async () => {
    mockCalendar.setError('events.list', new Error('Calendar not found'));
    await assert.rejects(
      async () => mockCalendar.events.list({ calendarId: 'invalid' }),
      { message: 'Calendar not found' }
    );
  });

  it('should track events.insert calls', async () => {
    await mockCalendar.events.insert({
      calendarId: 'primary',
      requestBody: { summary: 'New Event' }
    });
    assert.strictEqual(mockCalendar.calls.length, 1);
    assert.strictEqual(mockCalendar.calls[0].method, 'events.insert');
  });

  it('should track events.delete calls', async () => {
    await mockCalendar.events.delete({
      calendarId: 'primary',
      eventId: 'event-123'
    });
    assert.strictEqual(mockCalendar.calls.length, 1);
    assert.strictEqual(mockCalendar.calls[0].method, 'events.delete');
  });

  it('should track freebusy.query calls', async () => {
    await mockCalendar.freebusy.query({
      requestBody: {
        timeMin: '2024-01-15T00:00:00Z',
        timeMax: '2024-01-15T23:59:59Z',
        items: [{ id: 'primary' }]
      }
    });
    assert.strictEqual(mockCalendar.calls.length, 1);
    assert.strictEqual(mockCalendar.calls[0].method, 'freebusy.query');
  });

});
