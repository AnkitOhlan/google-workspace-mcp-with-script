// src/calendarApiHelpers.ts
// Google Calendar API helper functions

import { calendar_v3 } from 'googleapis';
import { UserError } from 'fastmcp';

type Calendar = calendar_v3.Calendar;

// --- Constants ---
const MAX_RESULTS_DEFAULT = 250; // Default max results for list operations
const PRIMARY_CALENDAR = 'primary'; // Default calendar ID

// --- Types ---
export interface CalendarInfo {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: EventDateTime;
  end?: EventDateTime;
  status?: string;
  htmlLink?: string;
  hangoutLink?: string;
  meetingLink?: string;
  attendees?: EventAttendee[];
  organizer?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  creator?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  recurrence?: string[];
  recurringEventId?: string;
  reminders?: {
    useDefault?: boolean;
    overrides?: { method: string; minutes: number }[];
  };
  attachments?: EventAttachment[];
  created?: string;
  updated?: string;
}

export interface EventDateTime {
  dateTime?: string;  // For timed events (RFC3339)
  date?: string;      // For all-day events (YYYY-MM-DD)
  timeZone?: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  organizer?: boolean;
  self?: boolean;
  optional?: boolean;
}

export interface EventAttachment {
  fileId?: string;
  fileUrl?: string;
  title?: string;
  mimeType?: string;
  iconLink?: string;
}

export interface CreateEventOptions {
  summary: string;
  description?: string;
  location?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: string[];  // Email addresses
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  conferenceType?: 'hangoutsMeet' | 'addOn';
  recurrence?: string[];  // RRULE strings
  reminders?: {
    useDefault?: boolean;
    overrides?: { method: 'email' | 'popup'; minutes: number }[];
  };
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  transparency?: 'opaque' | 'transparent';
  attachments?: { fileUrl: string; title?: string }[];
  colorId?: string;
}

export interface UpdateEventOptions {
  summary?: string;
  description?: string;
  location?: string;
  start?: EventDateTime;
  end?: EventDateTime;
  attendees?: string[];
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  recurrence?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: { method: 'email' | 'popup'; minutes: number }[];
  };
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  colorId?: string;
}

// --- Helper Functions ---

/**
 * Convert API calendar to our CalendarInfo format
 */
function convertToCalendarInfo(calendar: calendar_v3.Schema$CalendarListEntry): CalendarInfo {
  return {
    id: calendar.id || '',
    summary: calendar.summary || '',
    description: calendar.description || undefined,
    timeZone: calendar.timeZone || undefined,
    primary: calendar.primary || false,
    accessRole: calendar.accessRole || undefined,
    backgroundColor: calendar.backgroundColor || undefined,
    foregroundColor: calendar.foregroundColor || undefined
  };
}

/**
 * Convert API event to our CalendarEvent format
 */
function convertToCalendarEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  const result: CalendarEvent = {
    id: event.id || '',
    summary: event.summary || undefined,
    description: event.description || undefined,
    location: event.location || undefined,
    status: event.status || undefined,
    htmlLink: event.htmlLink || undefined,
    created: event.created || undefined,
    updated: event.updated || undefined
  };

  // Handle start/end times
  if (event.start) {
    result.start = {
      dateTime: event.start.dateTime || undefined,
      date: event.start.date || undefined,
      timeZone: event.start.timeZone || undefined
    };
  }

  if (event.end) {
    result.end = {
      dateTime: event.end.dateTime || undefined,
      date: event.end.date || undefined,
      timeZone: event.end.timeZone || undefined
    };
  }

  // Handle hangout/meet link
  if (event.hangoutLink) {
    result.hangoutLink = event.hangoutLink;
  }
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
    if (videoEntry?.uri) {
      result.meetingLink = videoEntry.uri;
    }
  }

  // Handle attendees
  if (event.attendees) {
    result.attendees = event.attendees.map(a => ({
      email: a.email || '',
      displayName: a.displayName || undefined,
      responseStatus: a.responseStatus as EventAttendee['responseStatus'] || undefined,
      organizer: a.organizer || undefined,
      self: a.self || undefined,
      optional: a.optional || undefined
    }));
  }

  // Handle organizer
  if (event.organizer) {
    result.organizer = {
      email: event.organizer.email || undefined,
      displayName: event.organizer.displayName || undefined,
      self: event.organizer.self || undefined
    };
  }

  // Handle creator
  if (event.creator) {
    result.creator = {
      email: event.creator.email || undefined,
      displayName: event.creator.displayName || undefined,
      self: event.creator.self || undefined
    };
  }

  // Handle recurrence
  if (event.recurrence) {
    result.recurrence = event.recurrence;
  }
  if (event.recurringEventId) {
    result.recurringEventId = event.recurringEventId;
  }

  // Handle reminders
  if (event.reminders) {
    result.reminders = {
      useDefault: event.reminders.useDefault || undefined,
      overrides: event.reminders.overrides?.map(o => ({
        method: o.method || '',
        minutes: o.minutes || 0
      }))
    };
  }

  // Handle attachments
  if (event.attachments) {
    result.attachments = event.attachments.map(a => ({
      fileId: a.fileId || undefined,
      fileUrl: a.fileUrl || undefined,
      title: a.title || undefined,
      mimeType: a.mimeType || undefined,
      iconLink: a.iconLink || undefined
    }));
  }

  return result;
}

// --- Core API Functions ---

/**
 * List all accessible calendars
 */
export async function listCalendars(
  calendar: Calendar,
  showHidden: boolean = false
): Promise<CalendarInfo[]> {
  try {
    const response = await calendar.calendarList.list({
      showHidden,
      maxResults: MAX_RESULTS_DEFAULT
    });

    return (response.data.items || []).map(convertToCalendarInfo);
  } catch (error: any) {
    console.error('Calendar list error:', error.message);
    if (error.code === 401) throw new UserError('Calendar authentication failed. Please re-authenticate.');
    if (error.code === 403) throw new UserError('Permission denied for Calendar access.');
    throw new Error(`Failed to list calendars: ${error.message}`);
  }
}

/**
 * Get calendar by ID
 */
export async function getCalendar(
  calendar: Calendar,
  calendarId: string = PRIMARY_CALENDAR
): Promise<CalendarInfo> {
  try {
    const response = await calendar.calendarList.get({
      calendarId
    });

    return convertToCalendarInfo(response.data);
  } catch (error: any) {
    console.error(`Calendar get error for ${calendarId}:`, error.message);
    if (error.code === 404) throw new UserError(`Calendar not found: ${calendarId}`);
    throw new Error(`Failed to get calendar: ${error.message}`);
  }
}

/**
 * List events from a calendar with filtering
 */
export async function listEvents(
  calendar: Calendar,
  options?: {
    calendarId?: string;
    timeMin?: string;  // RFC3339 timestamp
    timeMax?: string;  // RFC3339 timestamp
    query?: string;    // Free text search
    maxResults?: number;
    singleEvents?: boolean;  // Expand recurring events
    orderBy?: 'startTime' | 'updated';
    showDeleted?: boolean;
  }
): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
  try {
    const calendarId = options?.calendarId || PRIMARY_CALENDAR;

    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      maxResults: options?.maxResults || MAX_RESULTS_DEFAULT,
      singleEvents: options?.singleEvents ?? true,
      orderBy: options?.orderBy || 'startTime',
      showDeleted: options?.showDeleted || false
    };

    if (options?.timeMin) params.timeMin = options.timeMin;
    if (options?.timeMax) params.timeMax = options.timeMax;
    if (options?.query) params.q = options.query;

    const response = await calendar.events.list(params);

    return {
      events: (response.data.items || []).map(convertToCalendarEvent),
      nextPageToken: response.data.nextPageToken || undefined
    };
  } catch (error: any) {
    console.error('Calendar list events error:', error.message);
    if (error.code === 404) throw new UserError(`Calendar not found: ${options?.calendarId || PRIMARY_CALENDAR}`);
    throw new Error(`Failed to list events: ${error.message}`);
  }
}

/**
 * Get a single event by ID
 */
export async function getEvent(
  calendar: Calendar,
  eventId: string,
  calendarId: string = PRIMARY_CALENDAR
): Promise<CalendarEvent> {
  try {
    const response = await calendar.events.get({
      calendarId,
      eventId
    });

    return convertToCalendarEvent(response.data);
  } catch (error: any) {
    console.error(`Calendar get event error for ${eventId}:`, error.message);
    if (error.code === 404) throw new UserError(`Event not found: ${eventId}`);
    throw new Error(`Failed to get event: ${error.message}`);
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(
  calendar: Calendar,
  options: CreateEventOptions,
  calendarId: string = PRIMARY_CALENDAR
): Promise<CalendarEvent> {
  try {
    const eventResource: calendar_v3.Schema$Event = {
      summary: options.summary,
      description: options.description,
      location: options.location,
      start: options.start,
      end: options.end,
      visibility: options.visibility,
      transparency: options.transparency,
      colorId: options.colorId
    };

    // Add attendees
    if (options.attendees && options.attendees.length > 0) {
      eventResource.attendees = options.attendees.map(email => ({ email }));
    }

    // Add recurrence
    if (options.recurrence) {
      eventResource.recurrence = options.recurrence;
    }

    // Add reminders
    if (options.reminders) {
      eventResource.reminders = {
        useDefault: options.reminders.useDefault ?? false,
        overrides: options.reminders.overrides
      };
    }

    // Add conference (Google Meet)
    let conferenceDataVersion = 0;
    if (options.conferenceType === 'hangoutsMeet') {
      eventResource.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
      conferenceDataVersion = 1;
    }

    // Add attachments
    if (options.attachments && options.attachments.length > 0) {
      eventResource.attachments = options.attachments.map(a => ({
        fileUrl: a.fileUrl,
        title: a.title
      }));
    }

    const params: calendar_v3.Params$Resource$Events$Insert = {
      calendarId,
      requestBody: eventResource,
      sendUpdates: options.sendUpdates || 'none'
    };

    if (conferenceDataVersion > 0) {
      params.conferenceDataVersion = conferenceDataVersion;
    }

    if (options.attachments && options.attachments.length > 0) {
      params.supportsAttachments = true;
    }

    const response = await calendar.events.insert(params);

    return convertToCalendarEvent(response.data);
  } catch (error: any) {
    console.error('Calendar create event error:', error.message);
    if (error.code === 400) throw new UserError(`Invalid event data: ${error.message}`);
    if (error.code === 404) throw new UserError(`Calendar not found: ${calendarId}`);
    throw new Error(`Failed to create event: ${error.message}`);
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  calendar: Calendar,
  eventId: string,
  updates: UpdateEventOptions,
  calendarId: string = PRIMARY_CALENDAR
): Promise<CalendarEvent> {
  try {
    // First get the existing event
    const existingEvent = await calendar.events.get({
      calendarId,
      eventId
    });

    const eventResource: calendar_v3.Schema$Event = {
      ...existingEvent.data
    };

    // Apply updates
    if (updates.summary !== undefined) eventResource.summary = updates.summary;
    if (updates.description !== undefined) eventResource.description = updates.description;
    if (updates.location !== undefined) eventResource.location = updates.location;
    if (updates.start) eventResource.start = updates.start;
    if (updates.end) eventResource.end = updates.end;
    if (updates.visibility) eventResource.visibility = updates.visibility;
    if (updates.colorId) eventResource.colorId = updates.colorId;

    // Update attendees
    if (updates.attendees !== undefined) {
      eventResource.attendees = updates.attendees.map(email => ({ email }));
    }

    // Update recurrence
    if (updates.recurrence !== undefined) {
      eventResource.recurrence = updates.recurrence;
    }

    // Update reminders
    if (updates.reminders) {
      eventResource.reminders = {
        useDefault: updates.reminders.useDefault ?? false,
        overrides: updates.reminders.overrides
      };
    }

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: eventResource,
      sendUpdates: updates.sendUpdates || 'none'
    });

    return convertToCalendarEvent(response.data);
  } catch (error: any) {
    console.error(`Calendar update event error for ${eventId}:`, error.message);
    if (error.code === 400) throw new UserError(`Invalid event data: ${error.message}`);
    if (error.code === 404) throw new UserError(`Event not found: ${eventId}`);
    throw new Error(`Failed to update event: ${error.message}`);
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(
  calendar: Calendar,
  eventId: string,
  calendarId: string = PRIMARY_CALENDAR,
  sendUpdates: 'all' | 'externalOnly' | 'none' = 'none'
): Promise<void> {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates
    });
  } catch (error: any) {
    console.error(`Calendar delete event error for ${eventId}:`, error.message);
    if (error.code === 404) throw new UserError(`Event not found: ${eventId}`);
    if (error.code === 410) {
      // Event was already deleted
      console.warn(`Event ${eventId} was already deleted`);
      return;
    }
    throw new Error(`Failed to delete event: ${error.message}`);
  }
}

/**
 * Quick add event using natural language
 */
export async function quickAddEvent(
  calendar: Calendar,
  text: string,
  calendarId: string = PRIMARY_CALENDAR,
  sendUpdates: 'all' | 'externalOnly' | 'none' = 'none'
): Promise<CalendarEvent> {
  try {
    const response = await calendar.events.quickAdd({
      calendarId,
      text,
      sendUpdates
    });

    return convertToCalendarEvent(response.data);
  } catch (error: any) {
    console.error('Calendar quick add error:', error.message);
    if (error.code === 400) throw new UserError(`Could not parse event text: ${text}`);
    throw new Error(`Failed to quick add event: ${error.message}`);
  }
}

/**
 * Move an event to another calendar
 */
export async function moveEvent(
  calendar: Calendar,
  eventId: string,
  sourceCalendarId: string,
  destinationCalendarId: string,
  sendUpdates: 'all' | 'externalOnly' | 'none' = 'none'
): Promise<CalendarEvent> {
  try {
    const response = await calendar.events.move({
      calendarId: sourceCalendarId,
      eventId,
      destination: destinationCalendarId,
      sendUpdates
    });

    return convertToCalendarEvent(response.data);
  } catch (error: any) {
    console.error(`Calendar move event error for ${eventId}:`, error.message);
    if (error.code === 404) throw new UserError(`Event or calendar not found`);
    throw new Error(`Failed to move event: ${error.message}`);
  }
}

/**
 * Get free/busy information for calendars
 */
export async function getFreeBusy(
  calendar: Calendar,
  timeMin: string,
  timeMax: string,
  calendarIds: string[] = [PRIMARY_CALENDAR]
): Promise<{ [calendarId: string]: { busy: { start: string; end: string }[] } }> {
  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: calendarIds.map(id => ({ id }))
      }
    });

    const result: { [calendarId: string]: { busy: { start: string; end: string }[] } } = {};

    if (response.data.calendars) {
      for (const [calId, calData] of Object.entries(response.data.calendars)) {
        result[calId] = {
          busy: (calData.busy || []).map(b => ({
            start: b.start || '',
            end: b.end || ''
          }))
        };
      }
    }

    return result;
  } catch (error: any) {
    console.error('Calendar free/busy error:', error.message);
    throw new Error(`Failed to get free/busy info: ${error.message}`);
  }
}
