// src/tools/calendarTools.ts
// Google Calendar API tools

import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import { getCalendarClient } from '../clients.js';
import * as CalendarHelpers from '../calendarApiHelpers.js';

// Zod schema for event datetime
const EventDateTimeSchema = z.object({
  dateTime: z.string().optional().describe('RFC3339 timestamp for timed events (e.g., "2024-01-15T09:00:00-08:00").'),
  date: z.string().optional().describe('Date for all-day events (YYYY-MM-DD format).'),
  timeZone: z.string().optional().describe('Time zone (e.g., "America/Los_Angeles").'),
});

/**
 * Register all Calendar tools with the server
 */
export function registerCalendarTools(server: FastMCP) {

  // Tool: listCalendars
  server.addTool({
    name: 'listCalendars',
    description: 'List all accessible Google Calendars for the authenticated user.',
    parameters: z.object({
      showHidden: z.boolean().optional().default(false).describe('Include hidden calendars.'),
    }),
    execute: async (args, { log }) => {
      const calendar = await getCalendarClient();
      log.info('Listing Google Calendars');

      try {
        const calendars = await CalendarHelpers.listCalendars(calendar, args.showHidden);

        if (calendars.length === 0) {
          return 'No calendars found.';
        }

        let output = `**Google Calendars (${calendars.length})**\n\n`;
        output += `| Calendar | ID | Access | Primary |\n`;
        output += `|----------|-----|--------|----------|\n`;

        calendars.forEach(cal => {
          output += `| ${cal.summary} | ${cal.id} | ${cal.accessRole || '-'} | ${cal.primary ? 'Yes' : '-'} |\n`;
        });

        return output;
      } catch (error: any) {
        log.error(`Calendar list error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to list calendars: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: getCalendarEvents
  server.addTool({
    name: 'getCalendarEvents',
    description: 'Get events from a Google Calendar with optional filtering.',
    parameters: z.object({
      calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary calendar).'),
      timeMin: z.string().optional().describe('Start of time range (RFC3339, e.g., "2024-01-01T00:00:00Z").'),
      timeMax: z.string().optional().describe('End of time range (RFC3339).'),
      query: z.string().optional().describe('Free text search in events.'),
      maxResults: z.number().int().min(1).max(250).optional().default(50).describe('Maximum events to return (1-250).'),
      singleEvents: z.boolean().optional().default(true).describe('Expand recurring events into instances.'),
      orderBy: z.enum(['startTime', 'updated']).optional().default('startTime').describe('Sort order.'),
    }),
    execute: async (args, { log }) => {
      const calendar = await getCalendarClient();
      log.info(`Getting events from calendar: ${args.calendarId}`);

      try {
        const result = await CalendarHelpers.listEvents(calendar, {
          calendarId: args.calendarId,
          timeMin: args.timeMin,
          timeMax: args.timeMax,
          query: args.query,
          maxResults: args.maxResults,
          singleEvents: args.singleEvents,
          orderBy: args.orderBy
        });

        if (result.events.length === 0) {
          return 'No events found matching your criteria.';
        }

        let output = `**Calendar Events (${result.events.length})**\n\n`;

        result.events.forEach((event, idx) => {
          output += `### ${idx + 1}. ${event.summary || '(No title)'}\n`;
          output += `**ID:** ${event.id}\n`;

          if (event.start?.dateTime) {
            output += `**Start:** ${event.start.dateTime}\n`;
          } else if (event.start?.date) {
            output += `**Date:** ${event.start.date} (all-day)\n`;
          }

          if (event.end?.dateTime) {
            output += `**End:** ${event.end.dateTime}\n`;
          }

          if (event.location) output += `**Location:** ${event.location}\n`;
          if (event.description) output += `**Description:** ${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}\n`;
          if (event.meetingLink) output += `**Meet Link:** ${event.meetingLink}\n`;

          if (event.attendees && event.attendees.length > 0) {
            output += `**Attendees:** ${event.attendees.map(a => a.email).join(', ')}\n`;
          }

          output += `\n`;
        });

        return output;
      } catch (error: any) {
        log.error(`Calendar events error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to get events: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: getCalendarEvent
  server.addTool({
    name: 'getCalendarEvent',
    description: 'Get a single calendar event by ID.',
    parameters: z.object({
      eventId: z.string().describe('The event ID to retrieve.'),
      calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary).'),
    }),
    execute: async (args, { log }) => {
      const calendar = await getCalendarClient();
      log.info(`Getting event: ${args.eventId}`);

      try {
        const event = await CalendarHelpers.getEvent(calendar, args.eventId, args.calendarId);

        let output = `**Calendar Event**\n\n`;
        output += `**ID:** ${event.id}\n`;
        output += `**Summary:** ${event.summary || '(No title)'}\n`;
        output += `**Status:** ${event.status || '-'}\n`;

        if (event.start?.dateTime) {
          output += `**Start:** ${event.start.dateTime}\n`;
        } else if (event.start?.date) {
          output += `**Date:** ${event.start.date} (all-day)\n`;
        }

        if (event.end?.dateTime) {
          output += `**End:** ${event.end.dateTime}\n`;
        } else if (event.end?.date) {
          output += `**End Date:** ${event.end.date}\n`;
        }

        if (event.location) output += `**Location:** ${event.location}\n`;
        if (event.description) output += `**Description:** ${event.description}\n`;
        if (event.htmlLink) output += `**Link:** ${event.htmlLink}\n`;
        if (event.meetingLink) output += `**Meet Link:** ${event.meetingLink}\n`;

        if (event.organizer) {
          output += `**Organizer:** ${event.organizer.displayName || event.organizer.email}${event.organizer.self ? ' (you)' : ''}\n`;
        }

        if (event.attendees && event.attendees.length > 0) {
          output += `\n**Attendees (${event.attendees.length}):**\n`;
          event.attendees.forEach(a => {
            output += `- ${a.displayName || a.email} (${a.responseStatus || 'unknown'})${a.organizer ? ' - organizer' : ''}\n`;
          });
        }

        if (event.recurrence) {
          output += `\n**Recurrence:** ${event.recurrence.join(', ')}\n`;
        }

        if (event.attachments && event.attachments.length > 0) {
          output += `\n**Attachments:**\n`;
          event.attachments.forEach(a => {
            output += `- ${a.title || 'Attachment'}: ${a.fileUrl || '-'}\n`;
          });
        }

        return output;
      } catch (error: any) {
        log.error(`Calendar get event error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to get event: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: createCalendarEvent
  server.addTool({
    name: 'createCalendarEvent',
    description: 'Create a new calendar event. Supports timed events, all-day events, and Google Meet integration.',
    parameters: z.object({
      summary: z.string().describe('Event title.'),
      description: z.string().optional().describe('Event description.'),
      location: z.string().optional().describe('Event location.'),
      start: EventDateTimeSchema.describe('Start time (use dateTime for timed events, date for all-day).'),
      end: EventDateTimeSchema.describe('End time (use dateTime for timed events, date for all-day).'),
      calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary).'),
      attendees: z.array(z.string()).optional().describe('Email addresses of attendees.'),
      sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional().default('none')
        .describe('Send notifications to attendees.'),
      conferenceType: z.enum(['hangoutsMeet']).optional().describe('Add Google Meet link.'),
      recurrence: z.array(z.string()).optional().describe('RRULE strings for recurring events (e.g., ["RRULE:FREQ=WEEKLY;COUNT=5"]).'),
      visibility: z.enum(['default', 'public', 'private', 'confidential']).optional()
        .describe('Event visibility.'),
    }),
    execute: async (args, { log }) => {
      const calendar = await getCalendarClient();
      log.info(`Creating event: ${args.summary}`);

      try {
        const event = await CalendarHelpers.createEvent(
          calendar,
          {
            summary: args.summary,
            description: args.description,
            location: args.location,
            start: args.start,
            end: args.end,
            attendees: args.attendees,
            sendUpdates: args.sendUpdates,
            conferenceType: args.conferenceType,
            recurrence: args.recurrence,
            visibility: args.visibility
          },
          args.calendarId
        );

        let output = `**Event Created Successfully!**\n\n`;
        output += `**ID:** ${event.id}\n`;
        output += `**Summary:** ${event.summary}\n`;
        output += `**Link:** ${event.htmlLink}\n`;

        if (event.meetingLink) {
          output += `**Google Meet:** ${event.meetingLink}\n`;
        }

        return output;
      } catch (error: any) {
        log.error(`Calendar create error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to create event: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: updateCalendarEvent
  server.addTool({
    name: 'updateCalendarEvent',
    description: 'Update an existing calendar event.',
    parameters: z.object({
      eventId: z.string().describe('The event ID to update.'),
      calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary).'),
      summary: z.string().optional().describe('New event title.'),
      description: z.string().optional().describe('New event description.'),
      location: z.string().optional().describe('New event location.'),
      start: EventDateTimeSchema.optional().describe('New start time.'),
      end: EventDateTimeSchema.optional().describe('New end time.'),
      attendees: z.array(z.string()).optional().describe('Updated attendee emails (replaces existing).'),
      sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional().default('none')
        .describe('Send notifications about the update.'),
    }),
    execute: async (args, { log }) => {
      const calendar = await getCalendarClient();
      log.info(`Updating event: ${args.eventId}`);

      try {
        const event = await CalendarHelpers.updateEvent(
          calendar,
          args.eventId,
          {
            summary: args.summary,
            description: args.description,
            location: args.location,
            start: args.start,
            end: args.end,
            attendees: args.attendees,
            sendUpdates: args.sendUpdates
          },
          args.calendarId
        );

        let output = `**Event Updated Successfully!**\n\n`;
        output += `**ID:** ${event.id}\n`;
        output += `**Summary:** ${event.summary}\n`;
        output += `**Link:** ${event.htmlLink}\n`;

        return output;
      } catch (error: any) {
        log.error(`Calendar update error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to update event: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: deleteCalendarEvent
  server.addTool({
    name: 'deleteCalendarEvent',
    description: 'Delete a calendar event.',
    parameters: z.object({
      eventId: z.string().describe('The event ID to delete.'),
      calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary).'),
      sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional().default('none')
        .describe('Send cancellation notifications to attendees.'),
    }),
    execute: async (args, { log }) => {
      const calendar = await getCalendarClient();
      log.info(`Deleting event: ${args.eventId}`);

      try {
        await CalendarHelpers.deleteEvent(
          calendar,
          args.eventId,
          args.calendarId,
          args.sendUpdates
        );

        return `**Event Deleted Successfully!**\n\nEvent ID: ${args.eventId}`;
      } catch (error: any) {
        log.error(`Calendar delete error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to delete event: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: quickAddCalendarEvent
  server.addTool({
    name: 'quickAddCalendarEvent',
    description: 'Quickly create an event using natural language (e.g., "Meeting tomorrow at 3pm").',
    parameters: z.object({
      text: z.string().describe('Natural language event description (e.g., "Lunch with John next Friday at 12pm").'),
      calendarId: z.string().optional().default('primary').describe('Calendar ID (default: primary).'),
      sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional().default('none')
        .describe('Send notifications.'),
    }),
    execute: async (args, { log }) => {
      const calendar = await getCalendarClient();
      log.info(`Quick adding event: ${args.text}`);

      try {
        const event = await CalendarHelpers.quickAddEvent(
          calendar,
          args.text,
          args.calendarId,
          args.sendUpdates
        );

        let output = `**Event Created (Quick Add)**\n\n`;
        output += `**ID:** ${event.id}\n`;
        output += `**Summary:** ${event.summary}\n`;

        if (event.start?.dateTime) {
          output += `**Start:** ${event.start.dateTime}\n`;
        } else if (event.start?.date) {
          output += `**Date:** ${event.start.date}\n`;
        }

        output += `**Link:** ${event.htmlLink}\n`;

        return output;
      } catch (error: any) {
        log.error(`Calendar quick add error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to quick add event: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: getCalendarFreeBusy
  server.addTool({
    name: 'getCalendarFreeBusy',
    description: 'Check free/busy information for calendars in a time range.',
    parameters: z.object({
      timeMin: z.string().describe('Start of time range (RFC3339).'),
      timeMax: z.string().describe('End of time range (RFC3339).'),
      calendarIds: z.array(z.string()).optional().describe('Calendar IDs to check (default: primary).'),
    }),
    execute: async (args, { log }) => {
      const calendar = await getCalendarClient();
      log.info('Getting free/busy information');

      try {
        const freeBusy = await CalendarHelpers.getFreeBusy(
          calendar,
          args.timeMin,
          args.timeMax,
          args.calendarIds || ['primary']
        );

        let output = `**Free/Busy Information**\n\n`;
        output += `**Time Range:** ${args.timeMin} to ${args.timeMax}\n\n`;

        for (const [calId, data] of Object.entries(freeBusy)) {
          output += `### Calendar: ${calId}\n`;
          if (data.busy.length === 0) {
            output += `*No busy times in this range*\n\n`;
          } else {
            output += `**Busy Times (${data.busy.length}):**\n`;
            data.busy.forEach(slot => {
              output += `- ${slot.start} to ${slot.end}\n`;
            });
            output += `\n`;
          }
        }

        return output;
      } catch (error: any) {
        log.error(`Calendar free/busy error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to get free/busy: ${error.message || 'Unknown error'}`);
      }
    },
  });

}

// Export tool count for documentation
export const CALENDAR_TOOLS_COUNT = 8;
