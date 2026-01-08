// src/gmailApiHelpers.ts
// Gmail API helper functions

import { gmail_v1 } from 'googleapis';
import { UserError } from 'fastmcp';

type Gmail = gmail_v1.Gmail;

// --- Constants ---
const MAX_BATCH_SIZE = 25; // Maximum messages per batch request
const MAX_RESULTS_DEFAULT = 50; // Default max results for list operations

// --- Types ---
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
  attachments?: GmailAttachment[];
}

export interface GmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface GmailThread {
  id: string;
  snippet?: string;
  messages: GmailMessage[];
}

export interface GmailLabel {
  id: string;
  name: string;
  type?: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface GmailFilter {
  id: string;
  criteria: gmail_v1.Schema$FilterCriteria;
  action: gmail_v1.Schema$FilterAction;
}

// --- Helper Functions ---

/**
 * Parse email headers to extract common fields
 */
function parseHeaders(headers: gmail_v1.Schema$MessagePartHeader[] | undefined): {
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
} {
  if (!headers) return {};

  const result: { subject?: string; from?: string; to?: string; date?: string } = {};
  for (const header of headers) {
    switch (header.name?.toLowerCase()) {
      case 'subject':
        result.subject = header.value || undefined;
        break;
      case 'from':
        result.from = header.value || undefined;
        break;
      case 'to':
        result.to = header.value || undefined;
        break;
      case 'date':
        result.date = header.value || undefined;
        break;
    }
  }
  return result;
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(data: string): string {
  // Replace URL-safe characters and decode
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Extract body text from message payload
 */
function extractBodyFromPayload(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  // If this part has body data
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // If this part has nested parts, recursively search
  if (payload.parts) {
    for (const part of payload.parts) {
      // Prefer text/plain, then text/html
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // If no text/plain found, try text/html
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Recursively check nested parts
    for (const part of payload.parts) {
      const nestedBody = extractBodyFromPayload(part);
      if (nestedBody) return nestedBody;
    }
  }

  return '';
}

/**
 * Extract attachments info from message payload
 */
function extractAttachments(payload: gmail_v1.Schema$MessagePart | undefined): GmailAttachment[] {
  const attachments: GmailAttachment[] = [];

  if (!payload) return attachments;

  const collectAttachments = (part: gmail_v1.Schema$MessagePart) => {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0
      });
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        collectAttachments(subPart);
      }
    }
  };

  collectAttachments(payload);
  return attachments;
}

/**
 * Convert API message to our GmailMessage format
 */
function convertToGmailMessage(message: gmail_v1.Schema$Message): GmailMessage {
  const headers = parseHeaders(message.payload?.headers);

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    labelIds: message.labelIds || undefined,
    snippet: message.snippet || undefined,
    subject: headers.subject,
    from: headers.from,
    to: headers.to,
    date: headers.date,
    body: extractBodyFromPayload(message.payload),
    attachments: extractAttachments(message.payload)
  };
}

// --- Core API Functions ---

/**
 * Search Gmail messages using query syntax
 */
export async function searchMessages(
  gmail: Gmail,
  query: string,
  maxResults: number = MAX_RESULTS_DEFAULT,
  labelIds?: string[],
  includeSpamTrash: boolean = false
): Promise<{ messages: { id: string; threadId: string }[]; nextPageToken?: string }> {
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
      labelIds,
      includeSpamTrash
    });

    return {
      messages: (response.data.messages || []).map(msg => ({
        id: msg.id || '',
        threadId: msg.threadId || ''
      })),
      nextPageToken: response.data.nextPageToken || undefined
    };
  } catch (error: any) {
    console.error('Gmail search error:', error.message);
    if (error.code === 401) throw new UserError('Gmail authentication failed. Please re-authenticate.');
    if (error.code === 403) throw new UserError('Permission denied for Gmail access.');
    throw new Error(`Gmail search failed: ${error.message}`);
  }
}

/**
 * Get full message content by ID
 */
export async function getMessage(
  gmail: Gmail,
  messageId: string,
  format: 'minimal' | 'full' | 'raw' | 'metadata' = 'full'
): Promise<GmailMessage> {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format
    });

    return convertToGmailMessage(response.data);
  } catch (error: any) {
    console.error(`Gmail get message error for ${messageId}:`, error.message);
    if (error.code === 404) throw new UserError(`Message not found: ${messageId}`);
    if (error.code === 401) throw new UserError('Gmail authentication failed.');
    throw new Error(`Failed to get message: ${error.message}`);
  }
}

/**
 * Batch get multiple messages (max 25)
 */
export async function getMessagesBatch(
  gmail: Gmail,
  messageIds: string[],
  format: 'minimal' | 'full' | 'metadata' = 'full'
): Promise<GmailMessage[]> {
  if (messageIds.length === 0) return [];
  if (messageIds.length > MAX_BATCH_SIZE) {
    throw new UserError(`Maximum ${MAX_BATCH_SIZE} messages per batch. Received: ${messageIds.length}`);
  }

  const messages: GmailMessage[] = [];

  // Process in parallel with Promise.all
  const promises = messageIds.map(id => getMessage(gmail, id, format).catch(err => {
    console.error(`Failed to get message ${id}:`, err.message);
    return null;
  }));

  const results = await Promise.all(promises);

  for (const result of results) {
    if (result) messages.push(result);
  }

  return messages;
}

/**
 * Get attachment content
 */
export async function getAttachment(
  gmail: Gmail,
  messageId: string,
  attachmentId: string
): Promise<{ data: string; size: number }> {
  try {
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId
    });

    if (!response.data.data) {
      throw new Error('Attachment data is empty');
    }

    return {
      data: response.data.data,
      size: response.data.size || 0
    };
  } catch (error: any) {
    console.error(`Gmail get attachment error:`, error.message);
    if (error.code === 404) throw new UserError('Attachment not found');
    throw new Error(`Failed to get attachment: ${error.message}`);
  }
}

/**
 * Send an email message
 */
export async function sendMessage(
  gmail: Gmail,
  to: string,
  subject: string,
  body: string,
  options?: {
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }
): Promise<{ id: string; threadId: string }> {
  try {
    // Build RFC 2822 formatted email
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8'
    ];

    if (options?.cc) messageParts.splice(1, 0, `Cc: ${options.cc}`);
    if (options?.bcc) messageParts.splice(1, 0, `Bcc: ${options.bcc}`);
    if (options?.inReplyTo) messageParts.push(`In-Reply-To: ${options.inReplyTo}`);
    if (options?.references) messageParts.push(`References: ${options.references}`);

    messageParts.push('', body);

    const rawMessage = Buffer.from(messageParts.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const requestBody: gmail_v1.Schema$Message = { raw: rawMessage };
    if (options?.threadId) requestBody.threadId = options.threadId;

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody
    });

    return {
      id: response.data.id || '',
      threadId: response.data.threadId || ''
    };
  } catch (error: any) {
    console.error('Gmail send error:', error.message);
    if (error.code === 401) throw new UserError('Gmail authentication failed.');
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

/**
 * Create a draft email
 */
export async function createDraft(
  gmail: Gmail,
  to: string,
  subject: string,
  body: string,
  options?: {
    cc?: string;
    bcc?: string;
    threadId?: string;
  }
): Promise<{ id: string; messageId: string }> {
  try {
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8'
    ];

    if (options?.cc) messageParts.splice(1, 0, `Cc: ${options.cc}`);
    if (options?.bcc) messageParts.splice(1, 0, `Bcc: ${options.bcc}`);

    messageParts.push('', body);

    const rawMessage = Buffer.from(messageParts.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const requestBody: gmail_v1.Schema$Draft = {
      message: { raw: rawMessage }
    };
    if (options?.threadId) requestBody.message!.threadId = options.threadId;

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody
    });

    return {
      id: response.data.id || '',
      messageId: response.data.message?.id || ''
    };
  } catch (error: any) {
    console.error('Gmail create draft error:', error.message);
    throw new Error(`Failed to create draft: ${error.message}`);
  }
}

/**
 * Get thread with all messages
 */
export async function getThread(
  gmail: Gmail,
  threadId: string,
  format: 'minimal' | 'full' | 'metadata' = 'full'
): Promise<GmailThread> {
  try {
    const response = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format
    });

    const messages = (response.data.messages || []).map(convertToGmailMessage);

    return {
      id: response.data.id || '',
      snippet: response.data.snippet || undefined,
      messages
    };
  } catch (error: any) {
    console.error(`Gmail get thread error for ${threadId}:`, error.message);
    if (error.code === 404) throw new UserError(`Thread not found: ${threadId}`);
    throw new Error(`Failed to get thread: ${error.message}`);
  }
}

/**
 * Batch get multiple threads
 */
export async function getThreadsBatch(
  gmail: Gmail,
  threadIds: string[],
  format: 'minimal' | 'full' | 'metadata' = 'full'
): Promise<GmailThread[]> {
  if (threadIds.length === 0) return [];
  if (threadIds.length > MAX_BATCH_SIZE) {
    throw new UserError(`Maximum ${MAX_BATCH_SIZE} threads per batch. Received: ${threadIds.length}`);
  }

  const promises = threadIds.map(id => getThread(gmail, id, format).catch(err => {
    console.error(`Failed to get thread ${id}:`, err.message);
    return null;
  }));

  const results = await Promise.all(promises);
  return results.filter((t): t is GmailThread => t !== null);
}

/**
 * List all labels
 */
export async function listLabels(gmail: Gmail): Promise<GmailLabel[]> {
  try {
    const response = await gmail.users.labels.list({
      userId: 'me'
    });

    return (response.data.labels || []).map(label => ({
      id: label.id || '',
      name: label.name || '',
      type: label.type || undefined,
      messagesTotal: label.messagesTotal || undefined,
      messagesUnread: label.messagesUnread || undefined
    }));
  } catch (error: any) {
    console.error('Gmail list labels error:', error.message);
    throw new Error(`Failed to list labels: ${error.message}`);
  }
}

/**
 * Create a new label
 */
export async function createLabel(
  gmail: Gmail,
  name: string,
  options?: {
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
    messageListVisibility?: 'show' | 'hide';
    backgroundColor?: string;
    textColor?: string;
  }
): Promise<GmailLabel> {
  try {
    const requestBody: gmail_v1.Schema$Label = {
      name,
      labelListVisibility: options?.labelListVisibility || 'labelShow',
      messageListVisibility: options?.messageListVisibility || 'show'
    };

    if (options?.backgroundColor || options?.textColor) {
      requestBody.color = {
        backgroundColor: options?.backgroundColor,
        textColor: options?.textColor
      };
    }

    const response = await gmail.users.labels.create({
      userId: 'me',
      requestBody
    });

    return {
      id: response.data.id || '',
      name: response.data.name || '',
      type: response.data.type || undefined
    };
  } catch (error: any) {
    console.error('Gmail create label error:', error.message);
    if (error.code === 409) throw new UserError(`Label already exists: ${name}`);
    throw new Error(`Failed to create label: ${error.message}`);
  }
}

/**
 * Update a label
 */
export async function updateLabel(
  gmail: Gmail,
  labelId: string,
  updates: {
    name?: string;
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
    messageListVisibility?: 'show' | 'hide';
    backgroundColor?: string;
    textColor?: string;
  }
): Promise<GmailLabel> {
  try {
    const requestBody: gmail_v1.Schema$Label = {};

    if (updates.name) requestBody.name = updates.name;
    if (updates.labelListVisibility) requestBody.labelListVisibility = updates.labelListVisibility;
    if (updates.messageListVisibility) requestBody.messageListVisibility = updates.messageListVisibility;
    if (updates.backgroundColor || updates.textColor) {
      requestBody.color = {
        backgroundColor: updates.backgroundColor,
        textColor: updates.textColor
      };
    }

    const response = await gmail.users.labels.update({
      userId: 'me',
      id: labelId,
      requestBody
    });

    return {
      id: response.data.id || '',
      name: response.data.name || '',
      type: response.data.type || undefined
    };
  } catch (error: any) {
    console.error('Gmail update label error:', error.message);
    if (error.code === 404) throw new UserError(`Label not found: ${labelId}`);
    throw new Error(`Failed to update label: ${error.message}`);
  }
}

/**
 * Delete a label
 */
export async function deleteLabel(gmail: Gmail, labelId: string): Promise<void> {
  try {
    await gmail.users.labels.delete({
      userId: 'me',
      id: labelId
    });
  } catch (error: any) {
    console.error('Gmail delete label error:', error.message);
    if (error.code === 404) throw new UserError(`Label not found: ${labelId}`);
    if (error.code === 400) throw new UserError('Cannot delete system labels');
    throw new Error(`Failed to delete label: ${error.message}`);
  }
}

/**
 * List all filters
 */
export async function listFilters(gmail: Gmail): Promise<GmailFilter[]> {
  try {
    const response = await gmail.users.settings.filters.list({
      userId: 'me'
    });

    return (response.data.filter || []).map(filter => ({
      id: filter.id || '',
      criteria: filter.criteria || {},
      action: filter.action || {}
    }));
  } catch (error: any) {
    console.error('Gmail list filters error:', error.message);
    throw new Error(`Failed to list filters: ${error.message}`);
  }
}

/**
 * Create a filter
 */
export async function createFilter(
  gmail: Gmail,
  criteria: {
    from?: string;
    to?: string;
    subject?: string;
    query?: string;
    hasAttachment?: boolean;
    size?: number;
    sizeComparison?: 'larger' | 'smaller';
  },
  action: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
    forward?: string;
  }
): Promise<GmailFilter> {
  try {
    const filterCriteria: gmail_v1.Schema$FilterCriteria = {};
    if (criteria.from) filterCriteria.from = criteria.from;
    if (criteria.to) filterCriteria.to = criteria.to;
    if (criteria.subject) filterCriteria.subject = criteria.subject;
    if (criteria.query) filterCriteria.query = criteria.query;
    if (criteria.hasAttachment !== undefined) filterCriteria.hasAttachment = criteria.hasAttachment;
    if (criteria.size) filterCriteria.size = criteria.size;
    if (criteria.sizeComparison) filterCriteria.sizeComparison = criteria.sizeComparison;

    const filterAction: gmail_v1.Schema$FilterAction = {};
    if (action.addLabelIds) filterAction.addLabelIds = action.addLabelIds;
    if (action.removeLabelIds) filterAction.removeLabelIds = action.removeLabelIds;
    if (action.forward) filterAction.forward = action.forward;

    const response = await gmail.users.settings.filters.create({
      userId: 'me',
      requestBody: {
        criteria: filterCriteria,
        action: filterAction
      }
    });

    return {
      id: response.data.id || '',
      criteria: response.data.criteria || {},
      action: response.data.action || {}
    };
  } catch (error: any) {
    console.error('Gmail create filter error:', error.message);
    throw new Error(`Failed to create filter: ${error.message}`);
  }
}

/**
 * Delete a filter
 */
export async function deleteFilter(gmail: Gmail, filterId: string): Promise<void> {
  try {
    await gmail.users.settings.filters.delete({
      userId: 'me',
      id: filterId
    });
  } catch (error: any) {
    console.error('Gmail delete filter error:', error.message);
    if (error.code === 404) throw new UserError(`Filter not found: ${filterId}`);
    throw new Error(`Failed to delete filter: ${error.message}`);
  }
}

/**
 * Modify labels on a single message
 */
export async function modifyMessageLabels(
  gmail: Gmail,
  messageId: string,
  addLabelIds?: string[],
  removeLabelIds?: string[]
): Promise<GmailMessage> {
  try {
    const response = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: addLabelIds || [],
        removeLabelIds: removeLabelIds || []
      }
    });

    return convertToGmailMessage(response.data);
  } catch (error: any) {
    console.error('Gmail modify labels error:', error.message);
    if (error.code === 404) throw new UserError(`Message not found: ${messageId}`);
    throw new Error(`Failed to modify message labels: ${error.message}`);
  }
}

/**
 * Batch modify labels on multiple messages
 */
export async function batchModifyMessageLabels(
  gmail: Gmail,
  messageIds: string[],
  addLabelIds?: string[],
  removeLabelIds?: string[]
): Promise<void> {
  if (messageIds.length === 0) return;

  try {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: messageIds,
        addLabelIds: addLabelIds || [],
        removeLabelIds: removeLabelIds || []
      }
    });
  } catch (error: any) {
    console.error('Gmail batch modify labels error:', error.message);
    throw new Error(`Failed to batch modify labels: ${error.message}`);
  }
}

/**
 * Trash a message
 */
export async function trashMessage(gmail: Gmail, messageId: string): Promise<void> {
  try {
    await gmail.users.messages.trash({
      userId: 'me',
      id: messageId
    });
  } catch (error: any) {
    console.error('Gmail trash message error:', error.message);
    if (error.code === 404) throw new UserError(`Message not found: ${messageId}`);
    throw new Error(`Failed to trash message: ${error.message}`);
  }
}

/**
 * Untrash a message
 */
export async function untrashMessage(gmail: Gmail, messageId: string): Promise<void> {
  try {
    await gmail.users.messages.untrash({
      userId: 'me',
      id: messageId
    });
  } catch (error: any) {
    console.error('Gmail untrash message error:', error.message);
    if (error.code === 404) throw new UserError(`Message not found: ${messageId}`);
    throw new Error(`Failed to untrash message: ${error.message}`);
  }
}

/**
 * Permanently delete a message (cannot be undone!)
 */
export async function deleteMessage(gmail: Gmail, messageId: string): Promise<void> {
  try {
    await gmail.users.messages.delete({
      userId: 'me',
      id: messageId
    });
  } catch (error: any) {
    console.error('Gmail delete message error:', error.message);
    if (error.code === 404) throw new UserError(`Message not found: ${messageId}`);
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}
