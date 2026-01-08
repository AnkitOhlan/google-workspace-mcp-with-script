// src/tools/gmailTools.ts
// Gmail API tools

import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import { getGmailClient } from '../clients.js';
import * as GmailHelpers from '../gmailApiHelpers.js';

/**
 * Register all Gmail tools with the server
 */
export function registerGmailTools(server: FastMCP) {

  // Tool: searchGmailMessages
  server.addTool({
    name: 'searchGmailMessages',
    description: 'Search Gmail messages using query syntax. Supports operators like from:, to:, subject:, has:attachment, is:unread, after:, before:, label:, etc.',
    parameters: z.object({
      query: z.string().describe('Gmail search query (e.g., "from:example@gmail.com subject:hello is:unread after:2024/01/01").'),
      maxResults: z.number().int().min(1).max(100).optional().default(20).describe('Maximum number of results (1-100).'),
      labelIds: z.array(z.string()).optional().describe('Filter by specific label IDs.'),
      includeSpamTrash: z.boolean().optional().default(false).describe('Include messages from SPAM and TRASH.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Searching Gmail with query: ${args.query}`);

      try {
        const result = await GmailHelpers.searchMessages(
          gmail,
          args.query,
          args.maxResults,
          args.labelIds,
          args.includeSpamTrash
        );

        if (result.messages.length === 0) {
          return 'No messages found matching your query.';
        }

        let output = `**Found ${result.messages.length} message(s)**\n\n`;
        output += `| # | Message ID | Thread ID |\n`;
        output += `|---|------------|----------|\n`;

        result.messages.forEach((msg, idx) => {
          output += `| ${idx + 1} | ${msg.id} | ${msg.threadId} |\n`;
        });

        if (result.nextPageToken) {
          output += `\n*More results available. Use pagination for additional messages.*`;
        }

        output += `\n\n**Tip:** Use \`getGmailMessage\` with a Message ID to get full content.`;

        return output;
      } catch (error: any) {
        log.error(`Gmail search error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Gmail search failed: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: getGmailMessage
  server.addTool({
    name: 'getGmailMessage',
    description: 'Get the full content of a Gmail message by ID.',
    parameters: z.object({
      messageId: z.string().describe('The message ID to retrieve.'),
      format: z.enum(['full', 'metadata', 'minimal']).optional().default('full')
        .describe('Format: full (all data), metadata (headers only), minimal (IDs only).'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Getting Gmail message: ${args.messageId}`);

      try {
        const message = await GmailHelpers.getMessage(gmail, args.messageId, args.format);

        let output = `**Gmail Message**\n\n`;
        output += `**ID:** ${message.id}\n`;
        output += `**Thread ID:** ${message.threadId}\n`;
        if (message.from) output += `**From:** ${message.from}\n`;
        if (message.to) output += `**To:** ${message.to}\n`;
        if (message.subject) output += `**Subject:** ${message.subject}\n`;
        if (message.date) output += `**Date:** ${message.date}\n`;
        if (message.labelIds) output += `**Labels:** ${message.labelIds.join(', ')}\n`;

        if (message.body) {
          output += `\n**Body:**\n---\n${message.body}\n---\n`;
        }

        if (message.attachments && message.attachments.length > 0) {
          output += `\n**Attachments (${message.attachments.length}):**\n`;
          message.attachments.forEach(att => {
            output += `- ${att.filename} (${att.mimeType}, ${att.size} bytes)\n`;
          });
        }

        return output;
      } catch (error: any) {
        log.error(`Gmail get message error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to get message: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: getGmailMessagesBatch
  server.addTool({
    name: 'getGmailMessagesBatch',
    description: 'Get multiple Gmail messages in a single request (max 25).',
    parameters: z.object({
      messageIds: z.array(z.string()).min(1).max(25).describe('Array of message IDs (max 25).'),
      format: z.enum(['full', 'metadata', 'minimal']).optional().default('metadata')
        .describe('Format for each message.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Getting ${args.messageIds.length} Gmail messages in batch`);

      try {
        const messages = await GmailHelpers.getMessagesBatch(gmail, args.messageIds, args.format);

        let output = `**Retrieved ${messages.length} message(s)**\n\n`;

        messages.forEach((msg, idx) => {
          output += `### Message ${idx + 1}\n`;
          output += `- **ID:** ${msg.id}\n`;
          if (msg.from) output += `- **From:** ${msg.from}\n`;
          if (msg.subject) output += `- **Subject:** ${msg.subject}\n`;
          if (msg.date) output += `- **Date:** ${msg.date}\n`;
          if (msg.snippet) output += `- **Snippet:** ${msg.snippet}\n`;
          output += `\n`;
        });

        return output;
      } catch (error: any) {
        log.error(`Gmail batch get error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Batch get failed: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: getGmailAttachment
  server.addTool({
    name: 'getGmailAttachment',
    description: 'Download an attachment from a Gmail message. Returns base64-encoded data.',
    parameters: z.object({
      messageId: z.string().describe('The message ID containing the attachment.'),
      attachmentId: z.string().describe('The attachment ID (from getGmailMessage).'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Getting attachment ${args.attachmentId} from message ${args.messageId}`);

      try {
        const attachment = await GmailHelpers.getAttachment(gmail, args.messageId, args.attachmentId);

        return `**Attachment Retrieved**\n\n**Size:** ${attachment.size} bytes\n**Data (base64):**\n\`\`\`\n${attachment.data.substring(0, 500)}${attachment.data.length > 500 ? '...[truncated]' : ''}\n\`\`\`\n\n*Note: Full base64 data available for further processing.*`;
      } catch (error: any) {
        log.error(`Gmail attachment error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to get attachment: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: sendGmailMessage
  server.addTool({
    name: 'sendGmailMessage',
    description: 'Send an email via Gmail. Supports threading for replies.',
    parameters: z.object({
      to: z.string().describe('Recipient email address.'),
      subject: z.string().describe('Email subject line.'),
      body: z.string().describe('Email body content (plain text).'),
      cc: z.string().optional().describe('CC recipients (comma-separated).'),
      bcc: z.string().optional().describe('BCC recipients (comma-separated).'),
      threadId: z.string().optional().describe('Thread ID for replies (keeps conversation grouped).'),
      inReplyTo: z.string().optional().describe('Message-ID header of the message being replied to.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Sending email to: ${args.to}, Subject: ${args.subject}`);

      try {
        const result = await GmailHelpers.sendMessage(
          gmail,
          args.to,
          args.subject,
          args.body,
          {
            cc: args.cc,
            bcc: args.bcc,
            threadId: args.threadId,
            inReplyTo: args.inReplyTo
          }
        );

        return `**Email Sent Successfully!**\n\n**Message ID:** ${result.id}\n**Thread ID:** ${result.threadId}\n**To:** ${args.to}\n**Subject:** ${args.subject}`;
      } catch (error: any) {
        log.error(`Gmail send error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to send email: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: createGmailDraft
  server.addTool({
    name: 'createGmailDraft',
    description: 'Create a draft email in Gmail.',
    parameters: z.object({
      to: z.string().describe('Recipient email address.'),
      subject: z.string().describe('Email subject line.'),
      body: z.string().describe('Email body content (plain text).'),
      cc: z.string().optional().describe('CC recipients (comma-separated).'),
      bcc: z.string().optional().describe('BCC recipients (comma-separated).'),
      threadId: z.string().optional().describe('Thread ID for draft replies.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Creating draft to: ${args.to}, Subject: ${args.subject}`);

      try {
        const result = await GmailHelpers.createDraft(
          gmail,
          args.to,
          args.subject,
          args.body,
          {
            cc: args.cc,
            bcc: args.bcc,
            threadId: args.threadId
          }
        );

        return `**Draft Created Successfully!**\n\n**Draft ID:** ${result.id}\n**Message ID:** ${result.messageId}\n**To:** ${args.to}\n**Subject:** ${args.subject}\n\n*Find the draft in Gmail Drafts folder.*`;
      } catch (error: any) {
        log.error(`Gmail draft error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to create draft: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: getGmailThread
  server.addTool({
    name: 'getGmailThread',
    description: 'Get a complete email thread/conversation with all messages.',
    parameters: z.object({
      threadId: z.string().describe('The thread ID to retrieve.'),
      format: z.enum(['full', 'metadata', 'minimal']).optional().default('full')
        .describe('Format for messages in thread.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Getting Gmail thread: ${args.threadId}`);

      try {
        const thread = await GmailHelpers.getThread(gmail, args.threadId, args.format);

        let output = `**Gmail Thread**\n\n`;
        output += `**Thread ID:** ${thread.id}\n`;
        output += `**Messages:** ${thread.messages.length}\n`;
        if (thread.snippet) output += `**Snippet:** ${thread.snippet}\n`;
        output += `\n---\n\n`;

        thread.messages.forEach((msg, idx) => {
          output += `### Message ${idx + 1}\n`;
          if (msg.from) output += `**From:** ${msg.from}\n`;
          if (msg.to) output += `**To:** ${msg.to}\n`;
          if (msg.subject) output += `**Subject:** ${msg.subject}\n`;
          if (msg.date) output += `**Date:** ${msg.date}\n`;
          if (msg.body) {
            output += `\n${msg.body.substring(0, 500)}${msg.body.length > 500 ? '...[truncated]' : ''}\n`;
          }
          output += `\n---\n\n`;
        });

        return output;
      } catch (error: any) {
        log.error(`Gmail thread error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to get thread: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: listGmailLabels
  server.addTool({
    name: 'listGmailLabels',
    description: 'List all Gmail labels (folders and categories).',
    parameters: z.object({}),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info('Listing Gmail labels');

      try {
        const labels = await GmailHelpers.listLabels(gmail);

        let output = `**Gmail Labels (${labels.length})**\n\n`;
        output += `| Label Name | ID | Type | Messages | Unread |\n`;
        output += `|------------|-----|------|----------|--------|\n`;

        labels.forEach(label => {
          output += `| ${label.name} | ${label.id} | ${label.type || '-'} | ${label.messagesTotal ?? '-'} | ${label.messagesUnread ?? '-'} |\n`;
        });

        return output;
      } catch (error: any) {
        log.error(`Gmail labels error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to list labels: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: createGmailLabel
  server.addTool({
    name: 'createGmailLabel',
    description: 'Create a new Gmail label.',
    parameters: z.object({
      name: z.string().describe('Name for the new label.'),
      labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional()
        .describe('Visibility in label list.'),
      messageListVisibility: z.enum(['show', 'hide']).optional()
        .describe('Visibility in message list.'),
      backgroundColor: z.string().optional().describe('Background color (hex, e.g., "#ff0000").'),
      textColor: z.string().optional().describe('Text color (hex, e.g., "#ffffff").'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Creating Gmail label: ${args.name}`);

      try {
        const label = await GmailHelpers.createLabel(gmail, args.name, {
          labelListVisibility: args.labelListVisibility,
          messageListVisibility: args.messageListVisibility,
          backgroundColor: args.backgroundColor,
          textColor: args.textColor
        });

        return `**Label Created Successfully!**\n\n**Name:** ${label.name}\n**ID:** ${label.id}`;
      } catch (error: any) {
        log.error(`Gmail create label error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to create label: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: deleteGmailLabel
  server.addTool({
    name: 'deleteGmailLabel',
    description: 'Delete a Gmail label. Cannot delete system labels.',
    parameters: z.object({
      labelId: z.string().describe('The label ID to delete.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Deleting Gmail label: ${args.labelId}`);

      try {
        await GmailHelpers.deleteLabel(gmail, args.labelId);
        return `**Label Deleted Successfully!**\n\nLabel ID: ${args.labelId}`;
      } catch (error: any) {
        log.error(`Gmail delete label error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to delete label: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: listGmailFilters
  server.addTool({
    name: 'listGmailFilters',
    description: 'List all Gmail filters (automatic rules).',
    parameters: z.object({}),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info('Listing Gmail filters');

      try {
        const filters = await GmailHelpers.listFilters(gmail);

        if (filters.length === 0) {
          return 'No Gmail filters found.';
        }

        let output = `**Gmail Filters (${filters.length})**\n\n`;

        filters.forEach((filter, idx) => {
          output += `### Filter ${idx + 1}\n`;
          output += `**ID:** ${filter.id}\n`;
          output += `**Criteria:** ${JSON.stringify(filter.criteria, null, 2)}\n`;
          output += `**Action:** ${JSON.stringify(filter.action, null, 2)}\n\n`;
        });

        return output;
      } catch (error: any) {
        log.error(`Gmail filters error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to list filters: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: createGmailFilter
  server.addTool({
    name: 'createGmailFilter',
    description: 'Create a Gmail filter for automatic message processing.',
    parameters: z.object({
      from: z.string().optional().describe('Match sender email.'),
      to: z.string().optional().describe('Match recipient email.'),
      subject: z.string().optional().describe('Match subject contains.'),
      query: z.string().optional().describe('Gmail search query for criteria.'),
      hasAttachment: z.boolean().optional().describe('Match messages with attachments.'),
      addLabelIds: z.array(z.string()).optional().describe('Label IDs to add to matching messages.'),
      removeLabelIds: z.array(z.string()).optional().describe('Label IDs to remove from matching messages.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info('Creating Gmail filter');

      try {
        const filter = await GmailHelpers.createFilter(
          gmail,
          {
            from: args.from,
            to: args.to,
            subject: args.subject,
            query: args.query,
            hasAttachment: args.hasAttachment
          },
          {
            addLabelIds: args.addLabelIds,
            removeLabelIds: args.removeLabelIds
          }
        );

        return `**Filter Created Successfully!**\n\n**ID:** ${filter.id}\n**Criteria:** ${JSON.stringify(filter.criteria)}\n**Action:** ${JSON.stringify(filter.action)}`;
      } catch (error: any) {
        log.error(`Gmail create filter error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to create filter: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: deleteGmailFilter
  server.addTool({
    name: 'deleteGmailFilter',
    description: 'Delete a Gmail filter.',
    parameters: z.object({
      filterId: z.string().describe('The filter ID to delete.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Deleting Gmail filter: ${args.filterId}`);

      try {
        await GmailHelpers.deleteFilter(gmail, args.filterId);
        return `**Filter Deleted Successfully!**\n\nFilter ID: ${args.filterId}`;
      } catch (error: any) {
        log.error(`Gmail delete filter error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to delete filter: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: modifyGmailMessageLabels
  server.addTool({
    name: 'modifyGmailMessageLabels',
    description: 'Add or remove labels from a Gmail message.',
    parameters: z.object({
      messageId: z.string().describe('The message ID to modify.'),
      addLabelIds: z.array(z.string()).optional().describe('Label IDs to add.'),
      removeLabelIds: z.array(z.string()).optional().describe('Label IDs to remove.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Modifying labels for message: ${args.messageId}`);

      try {
        const message = await GmailHelpers.modifyMessageLabels(
          gmail,
          args.messageId,
          args.addLabelIds,
          args.removeLabelIds
        );

        return `**Labels Modified Successfully!**\n\n**Message ID:** ${message.id}\n**Current Labels:** ${message.labelIds?.join(', ') || 'none'}`;
      } catch (error: any) {
        log.error(`Gmail modify labels error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to modify labels: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Tool: trashGmailMessage
  server.addTool({
    name: 'trashGmailMessage',
    description: 'Move a Gmail message to Trash.',
    parameters: z.object({
      messageId: z.string().describe('The message ID to trash.'),
    }),
    execute: async (args, { log }) => {
      const gmail = await getGmailClient();
      log.info(`Trashing message: ${args.messageId}`);

      try {
        await GmailHelpers.trashMessage(gmail, args.messageId);
        return `**Message Moved to Trash**\n\nMessage ID: ${args.messageId}`;
      } catch (error: any) {
        log.error(`Gmail trash error: ${error.message || error}`);
        if (error instanceof UserError) throw error;
        throw new UserError(`Failed to trash message: ${error.message || 'Unknown error'}`);
      }
    },
  });

}

// Export tool count for documentation
export const GMAIL_TOOLS_COUNT = 15;
