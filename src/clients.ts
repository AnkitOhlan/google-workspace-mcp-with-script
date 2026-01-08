// src/clients.ts
// Centralized Google API client management

import { google, docs_v1, drive_v3, sheets_v4, script_v1, gmail_v1, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { JWT } from 'google-auth-library';
import { UserError } from 'fastmcp';
import { authorize } from './auth.js';

// Client instances
let authClient: OAuth2Client | JWT | null = null;
let googleDocs: docs_v1.Docs | null = null;
let googleDrive: drive_v3.Drive | null = null;
let googleSheets: sheets_v4.Sheets | null = null;
let googleScript: script_v1.Script | null = null;
let googleGmail: gmail_v1.Gmail | null = null;
let googleCalendar: calendar_v3.Calendar | null = null;

// Export auth client for tools that need direct access
export function getAuthClient() {
  return authClient;
}

/**
 * Initialize all Google API clients
 */
export async function initializeGoogleClient() {
  if (googleDocs && googleDrive && googleSheets && googleScript && googleGmail && googleCalendar) {
    return { authClient, googleDocs, googleDrive, googleSheets, googleScript, googleGmail, googleCalendar };
  }

  if (!authClient) {
    try {
      console.error("Attempting to authorize Google API client...");
      const client = await authorize();
      authClient = client;
      googleDocs = google.docs({ version: 'v1', auth: authClient });
      googleDrive = google.drive({ version: 'v3', auth: authClient });
      googleSheets = google.sheets({ version: 'v4', auth: authClient });
      googleScript = google.script({ version: 'v1', auth: authClient });
      googleGmail = google.gmail({ version: 'v1', auth: authClient });
      googleCalendar = google.calendar({ version: 'v3', auth: authClient });
      console.error("Google API client authorized successfully (Docs, Drive, Sheets, Script, Gmail, Calendar).");
    } catch (error) {
      console.error("FATAL: Failed to initialize Google API client:", error);
      authClient = null;
      googleDocs = null;
      googleDrive = null;
      googleSheets = null;
      googleScript = null;
      googleGmail = null;
      googleCalendar = null;
      throw new Error("Google client initialization failed. Cannot start server tools.");
    }
  }

  // Ensure all clients are set if authClient is valid
  if (authClient && !googleDocs) {
    googleDocs = google.docs({ version: 'v1', auth: authClient });
  }
  if (authClient && !googleDrive) {
    googleDrive = google.drive({ version: 'v3', auth: authClient });
  }
  if (authClient && !googleSheets) {
    googleSheets = google.sheets({ version: 'v4', auth: authClient });
  }
  if (authClient && !googleScript) {
    googleScript = google.script({ version: 'v1', auth: authClient });
  }
  if (authClient && !googleGmail) {
    googleGmail = google.gmail({ version: 'v1', auth: authClient });
  }
  if (authClient && !googleCalendar) {
    googleCalendar = google.calendar({ version: 'v3', auth: authClient });
  }

  if (!googleDocs || !googleDrive || !googleSheets || !googleScript || !googleGmail || !googleCalendar) {
    throw new Error("Google API clients could not be initialized.");
  }

  return { authClient, googleDocs, googleDrive, googleSheets, googleScript, googleGmail, googleCalendar };
}

/**
 * Get Google Docs client
 */
export async function getDocsClient(): Promise<docs_v1.Docs> {
  const { googleDocs: docs } = await initializeGoogleClient();
  if (!docs) {
    throw new UserError("Google Docs client is not initialized. Authentication might have failed.");
  }
  return docs;
}

/**
 * Get Google Drive client
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
  const { googleDrive: drive } = await initializeGoogleClient();
  if (!drive) {
    throw new UserError("Google Drive client is not initialized. Authentication might have failed.");
  }
  return drive;
}

/**
 * Get Google Sheets client
 */
export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const { googleSheets: sheets } = await initializeGoogleClient();
  if (!sheets) {
    throw new UserError("Google Sheets client is not initialized. Authentication might have failed.");
  }
  return sheets;
}

/**
 * Get Google Apps Script client
 */
export async function getScriptClient(): Promise<script_v1.Script> {
  const { googleScript: script } = await initializeGoogleClient();
  if (!script) {
    throw new UserError("Google Apps Script client is not initialized. Authentication might have failed.");
  }
  return script;
}

/**
 * Get Gmail client
 */
export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const { googleGmail: gmail } = await initializeGoogleClient();
  if (!gmail) {
    throw new UserError("Gmail client is not initialized. Authentication might have failed.");
  }
  return gmail;
}

/**
 * Get Google Calendar client
 */
export async function getCalendarClient(): Promise<calendar_v3.Calendar> {
  const { googleCalendar: calendar } = await initializeGoogleClient();
  if (!calendar) {
    throw new UserError("Google Calendar client is not initialized. Authentication might have failed.");
  }
  return calendar;
}

/**
 * Setup process-level error handlers to prevent crashes
 */
export function setupProcessErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
  });
}
