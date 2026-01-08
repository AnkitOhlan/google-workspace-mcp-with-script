// src/tools/index.ts
// Tool registry - exports all tool registration functions

export { registerScriptTools, SCRIPT_TOOLS_COUNT } from './scriptTools.js';
export { registerGmailTools, GMAIL_TOOLS_COUNT } from './gmailTools.js';
export { registerCalendarTools, CALENDAR_TOOLS_COUNT } from './calendarTools.js';

// Tool counts for documentation
export const TOOL_COUNTS = {
  docs: 15,      // Google Docs tools
  sheets: 14,    // Google Sheets tools
  drive: 16,     // Google Drive tools
  script: 4,     // Apps Script tools
  gmail: 15,     // Gmail tools
  calendar: 8,   // Calendar tools
  total: 72      // Updated total (15+14+16+4+15+8)
};

// Tool categories for documentation
export const TOOL_CATEGORIES = {
  'Google Docs': [
    'readGoogleDoc',
    'listDocumentTabs',
    'appendToGoogleDoc',
    'insertText',
    'deleteRange',
    'applyTextStyle',
    'applyParagraphStyle',
    'formatMatchingText',
    'insertTable',
    'editTableCell',
    'insertPageBreak',
    'insertImageFromUrl',
    'insertLocalImage',
    'fixListFormatting',
    'findElement',
  ],
  'Google Docs Comments': [
    'listComments',
    'getComment',
    'addComment',
    'replyToComment',
    'resolveComment',
    'deleteComment',
  ],
  'Google Sheets': [
    'readSpreadsheet',
    'writeSpreadsheet',
    'appendSpreadsheetRows',
    'clearSpreadsheetRange',
    'getSpreadsheetInfo',
    'addSpreadsheetSheet',
    'createSpreadsheet',
    'listGoogleSheets',
    'setBasicFilter',
    'clearBasicFilter',
    'formatSpreadsheetCells',
  ],
  'Google Drive': [
    'listGoogleDocs',
    'searchGoogleDocs',
    'getRecentGoogleDocs',
    'getDocumentInfo',
    'createFolder',
    'listFolderContents',
    'getFolderInfo',
    'moveFile',
    'copyFile',
    'renameFile',
    'deleteFile',
    'createDocument',
    'createFromTemplate',
  ],
  'Apps Script': [
    'createBoundScript',
    'updateScriptContent',
    'getScriptContent',
    'getScriptProjects',
  ],
  'Gmail': [
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
  ],
  'Google Calendar': [
    'listCalendars',
    'getCalendarEvents',
    'getCalendarEvent',
    'createCalendarEvent',
    'updateCalendarEvent',
    'deleteCalendarEvent',
    'quickAddCalendarEvent',
    'getCalendarFreeBusy',
  ],
};
