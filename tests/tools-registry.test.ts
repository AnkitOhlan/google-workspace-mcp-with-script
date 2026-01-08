// tests/tools-registry.test.ts
// Unit tests for tool registry

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TOOL_COUNTS, TOOL_CATEGORIES, SCRIPT_TOOLS_COUNT } from '../src/tools/index.js';

describe('Tool Registry', () => {

  describe('TOOL_COUNTS', () => {

    it('should have correct total count', () => {
      const calculatedTotal = TOOL_COUNTS.docs + TOOL_COUNTS.sheets +
                              TOOL_COUNTS.drive + TOOL_COUNTS.script +
                              TOOL_COUNTS.gmail + TOOL_COUNTS.calendar;
      assert.strictEqual(TOOL_COUNTS.total, calculatedTotal);
    });

    it('should have 72 total tools', () => {
      assert.strictEqual(TOOL_COUNTS.total, 72);
    });

    it('should have 15 docs tools', () => {
      assert.strictEqual(TOOL_COUNTS.docs, 15);
    });

    it('should have 14 sheets tools', () => {
      assert.strictEqual(TOOL_COUNTS.sheets, 14);
    });

    it('should have 16 drive tools', () => {
      assert.strictEqual(TOOL_COUNTS.drive, 16);
    });

    it('should have 4 script tools', () => {
      assert.strictEqual(TOOL_COUNTS.script, 4);
    });

    it('should have 15 gmail tools', () => {
      assert.strictEqual(TOOL_COUNTS.gmail, 15);
    });

    it('should have 8 calendar tools', () => {
      assert.strictEqual(TOOL_COUNTS.calendar, 8);
    });

  });

  describe('SCRIPT_TOOLS_COUNT', () => {

    it('should match TOOL_COUNTS.script', () => {
      assert.strictEqual(SCRIPT_TOOLS_COUNT, TOOL_COUNTS.script);
    });

  });

  describe('TOOL_CATEGORIES', () => {

    it('should have Google Docs category', () => {
      assert.ok(TOOL_CATEGORIES['Google Docs']);
      assert.ok(Array.isArray(TOOL_CATEGORIES['Google Docs']));
    });

    it('should have Google Docs Comments category', () => {
      assert.ok(TOOL_CATEGORIES['Google Docs Comments']);
    });

    it('should have Google Sheets category', () => {
      assert.ok(TOOL_CATEGORIES['Google Sheets']);
    });

    it('should have Google Drive category', () => {
      assert.ok(TOOL_CATEGORIES['Google Drive']);
    });

    it('should have Apps Script category', () => {
      assert.ok(TOOL_CATEGORIES['Apps Script']);
    });

    it('should have Gmail category', () => {
      assert.ok(TOOL_CATEGORIES['Gmail']);
      assert.ok(Array.isArray(TOOL_CATEGORIES['Gmail']));
    });

    it('should have Google Calendar category', () => {
      assert.ok(TOOL_CATEGORIES['Google Calendar']);
      assert.ok(Array.isArray(TOOL_CATEGORIES['Google Calendar']));
    });

    it('should have readGoogleDoc in Google Docs', () => {
      assert.ok(TOOL_CATEGORIES['Google Docs'].includes('readGoogleDoc'));
    });

    it('should have readSpreadsheet in Google Sheets', () => {
      assert.ok(TOOL_CATEGORIES['Google Sheets'].includes('readSpreadsheet'));
    });

    it('should have listGoogleDocs in Google Drive', () => {
      assert.ok(TOOL_CATEGORIES['Google Drive'].includes('listGoogleDocs'));
    });

    it('should have createBoundScript in Apps Script', () => {
      assert.ok(TOOL_CATEGORIES['Apps Script'].includes('createBoundScript'));
    });

    it('should have 4 Apps Script tools', () => {
      assert.strictEqual(TOOL_CATEGORIES['Apps Script'].length, 4);
    });

    it('should have searchGmailMessages in Gmail', () => {
      assert.ok(TOOL_CATEGORIES['Gmail'].includes('searchGmailMessages'));
    });

    it('should have sendGmailMessage in Gmail', () => {
      assert.ok(TOOL_CATEGORIES['Gmail'].includes('sendGmailMessage'));
    });

    it('should have 15 Gmail tools', () => {
      assert.strictEqual(TOOL_CATEGORIES['Gmail'].length, 15);
    });

    it('should have listCalendars in Google Calendar', () => {
      assert.ok(TOOL_CATEGORIES['Google Calendar'].includes('listCalendars'));
    });

    it('should have createCalendarEvent in Google Calendar', () => {
      assert.ok(TOOL_CATEGORIES['Google Calendar'].includes('createCalendarEvent'));
    });

    it('should have 8 Google Calendar tools', () => {
      assert.strictEqual(TOOL_CATEGORIES['Google Calendar'].length, 8);
    });

  });

});
