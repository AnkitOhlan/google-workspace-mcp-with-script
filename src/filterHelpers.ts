// filterHelpers.ts - Additional filter functions for Google Sheets
// Add this content to the end of googleSheetsApiHelpers.ts

import { sheets_v4 } from 'googleapis';
import { UserError } from 'fastmcp';

type Sheets = sheets_v4.Sheets;

// Helper function - copy from main file if not available
async function getSpreadsheetMetadataLocal(
  sheets: Sheets,
  spreadsheetId: string
): Promise<sheets_v4.Schema$Spreadsheet> {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });
  return response.data;
}

/**
 * Sets a basic filter (auto-filter) on a sheet
 * This enables the filter dropdowns on the header row
 */
export async function setBasicFilter(
  sheets: Sheets,
  spreadsheetId: string,
  sheetId?: number,
  range?: {
    startRowIndex?: number;
    endRowIndex?: number;
    startColumnIndex?: number;
    endColumnIndex?: number;
  }
): Promise<sheets_v4.Schema$BatchUpdateSpreadsheetResponse> {
  try {
    let targetSheetId = sheetId;
    if (targetSheetId === undefined) {
      const metadata = await getSpreadsheetMetadataLocal(sheets, spreadsheetId);
      const firstSheet = metadata.sheets?.[0];
      if (!firstSheet?.properties?.sheetId) {
        throw new UserError('Spreadsheet has no sheets.');
      }
      targetSheetId = firstSheet.properties.sheetId;
    }

    const filterRange: sheets_v4.Schema$GridRange = {
      sheetId: targetSheetId,
    };

    if (range) {
      if (range.startRowIndex !== undefined) filterRange.startRowIndex = range.startRowIndex;
      if (range.endRowIndex !== undefined) filterRange.endRowIndex = range.endRowIndex;
      if (range.startColumnIndex !== undefined) filterRange.startColumnIndex = range.startColumnIndex;
      if (range.endColumnIndex !== undefined) filterRange.endColumnIndex = range.endColumnIndex;
    }

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            setBasicFilter: {
              filter: {
                range: filterRange,
              },
            },
          },
        ],
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.code === 404) {
      throw new UserError('Spreadsheet not found. Check the ID.');
    }
    if (error.code === 403) {
      throw new UserError('Permission denied. Ensure you have write access.');
    }
    if (error instanceof UserError) throw error;
    throw new UserError('Failed to set basic filter: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Clears the basic filter from a sheet
 */
export async function clearBasicFilter(
  sheets: Sheets,
  spreadsheetId: string,
  sheetId?: number
): Promise<sheets_v4.Schema$BatchUpdateSpreadsheetResponse> {
  try {
    let targetSheetId = sheetId;
    if (targetSheetId === undefined) {
      const metadata = await getSpreadsheetMetadataLocal(sheets, spreadsheetId);
      const firstSheet = metadata.sheets?.[0];
      if (!firstSheet?.properties?.sheetId) {
        throw new UserError('Spreadsheet has no sheets.');
      }
      targetSheetId = firstSheet.properties.sheetId;
    }

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            clearBasicFilter: {
              sheetId: targetSheetId,
            },
          },
        ],
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.code === 404) {
      throw new UserError('Spreadsheet not found. Check the ID.');
    }
    if (error.code === 403) {
      throw new UserError('Permission denied. Ensure you have write access.');
    }
    if (error instanceof UserError) throw error;
    throw new UserError('Failed to clear basic filter: ' + (error.message || 'Unknown error'));
  }
}
