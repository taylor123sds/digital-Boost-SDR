/**
 * @file infrastructure/adapters/GoogleSheetsAdapter.js
 * @description Google Sheets service adapter
 * Wave 4: Infrastructure Layer - External Service Adapters
 */

import { google } from 'googleapis';
import { ExternalServiceError } from '../../utils/errors/index.js';

/**
 * Google Sheets Adapter
 * Wraps Google Sheets API with domain-friendly interface
 */
export class GoogleSheetsAdapter {
  /**
   * @param {Object} config - Configuration
   * @param {Object} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.sheets = null;
    this.auth = null;
  }

  /**
   * Initialize Google Sheets client
   * @private
   */
  async initialize() {
    if (this.sheets) {
      return; // Already initialized
    }

    try {
      this.logger.debug('Initializing Google Sheets client');

      // Create auth client
      this.auth = new google.auth.GoogleAuth({
        credentials: this.config.googleSheets.credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      // Create sheets client
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });

      this.logger.info('Google Sheets client initialized');
    } catch (error) {
      this.logger.error('Google Sheets initialization failed', {
        error: error.message
      });

      throw new ExternalServiceError(
        'GoogleSheets',
        `Initialization failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Ensure client is initialized
   * @private
   */
  async ensureInitialized() {
    if (!this.sheets) {
      await this.initialize();
    }
  }

  /**
   * Read values from sheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range in A1 notation
   * @returns {Promise<Array<Array>>} Values
   */
  async readValues(spreadsheetId, range) {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.logger.debug('Reading values from sheet', {
        spreadsheetId,
        range
      });

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const duration = Date.now() - startTime;
      const values = response.data.values || [];

      this.logger.info('Values read from sheet', {
        duration,
        spreadsheetId,
        range,
        rowCount: values.length
      });

      return values;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Read values failed', {
        duration,
        spreadsheetId,
        range,
        error: error.message
      });

      throw new ExternalServiceError(
        'GoogleSheets',
        `Failed to read values: ${error.message}`,
        error
      );
    }
  }

  /**
   * Write values to sheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range in A1 notation
   * @param {Array<Array>} values - Values to write
   * @param {Object} options - Write options
   * @returns {Promise<Object>} Write result
   */
  async writeValues(spreadsheetId, range, values, options = {}) {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.logger.debug('Writing values to sheet', {
        spreadsheetId,
        range,
        rowCount: values.length
      });

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: options.inputOption || 'USER_ENTERED',
        requestBody: {
          values
        }
      });

      const duration = Date.now() - startTime;

      this.logger.info('Values written to sheet', {
        duration,
        spreadsheetId,
        range,
        updatedRows: response.data.updatedRows,
        updatedCells: response.data.updatedCells
      });

      return {
        updatedRows: response.data.updatedRows,
        updatedColumns: response.data.updatedColumns,
        updatedCells: response.data.updatedCells
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Write values failed', {
        duration,
        spreadsheetId,
        range,
        error: error.message
      });

      throw new ExternalServiceError(
        'GoogleSheets',
        `Failed to write values: ${error.message}`,
        error
      );
    }
  }

  /**
   * Append values to sheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range in A1 notation
   * @param {Array<Array>} values - Values to append
   * @param {Object} options - Append options
   * @returns {Promise<Object>} Append result
   */
  async appendValues(spreadsheetId, range, values, options = {}) {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.logger.debug('Appending values to sheet', {
        spreadsheetId,
        range,
        rowCount: values.length
      });

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: options.inputOption || 'USER_ENTERED',
        insertDataOption: options.insertOption || 'INSERT_ROWS',
        requestBody: {
          values
        }
      });

      const duration = Date.now() - startTime;

      this.logger.info('Values appended to sheet', {
        duration,
        spreadsheetId,
        range,
        updatedRows: response.data.updates?.updatedRows
      });

      return {
        updatedRange: response.data.updates?.updatedRange,
        updatedRows: response.data.updates?.updatedRows,
        updatedColumns: response.data.updates?.updatedColumns,
        updatedCells: response.data.updates?.updatedCells
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Append values failed', {
        duration,
        spreadsheetId,
        range,
        error: error.message
      });

      throw new ExternalServiceError(
        'GoogleSheets',
        `Failed to append values: ${error.message}`,
        error
      );
    }
  }

  /**
   * Clear values from sheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range in A1 notation
   * @returns {Promise<Object>} Clear result
   */
  async clearValues(spreadsheetId, range) {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.logger.debug('Clearing values from sheet', {
        spreadsheetId,
        range
      });

      const response = await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range
      });

      const duration = Date.now() - startTime;

      this.logger.info('Values cleared from sheet', {
        duration,
        spreadsheetId,
        range
      });

      return {
        clearedRange: response.data.clearedRange
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Clear values failed', {
        duration,
        spreadsheetId,
        range,
        error: error.message
      });

      throw new ExternalServiceError(
        'GoogleSheets',
        `Failed to clear values: ${error.message}`,
        error
      );
    }
  }

  /**
   * Batch update values
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {Array<Object>} updates - Array of {range, values} objects
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async batchUpdateValues(spreadsheetId, updates, options = {}) {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.logger.debug('Batch updating values', {
        spreadsheetId,
        updateCount: updates.length
      });

      const data = updates.map(update => ({
        range: update.range,
        values: update.values
      }));

      const response = await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: options.inputOption || 'USER_ENTERED',
          data
        }
      });

      const duration = Date.now() - startTime;

      this.logger.info('Batch update complete', {
        duration,
        spreadsheetId,
        totalUpdatedRows: response.data.totalUpdatedRows,
        totalUpdatedCells: response.data.totalUpdatedCells
      });

      return {
        totalUpdatedRows: response.data.totalUpdatedRows,
        totalUpdatedColumns: response.data.totalUpdatedColumns,
        totalUpdatedCells: response.data.totalUpdatedCells,
        totalUpdatedSheets: response.data.totalUpdatedSheets
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Batch update failed', {
        duration,
        spreadsheetId,
        error: error.message
      });

      throw new ExternalServiceError(
        'GoogleSheets',
        `Failed to batch update values: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get sheet metadata
   * @param {string} spreadsheetId - Spreadsheet ID
   * @returns {Promise<Object>} Sheet metadata
   */
  async getSpreadsheetMetadata(spreadsheetId) {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.logger.debug('Getting spreadsheet metadata', { spreadsheetId });

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      const duration = Date.now() - startTime;

      this.logger.info('Spreadsheet metadata retrieved', {
        duration,
        spreadsheetId,
        title: response.data.properties?.title,
        sheetCount: response.data.sheets?.length
      });

      return {
        title: response.data.properties?.title,
        locale: response.data.properties?.locale,
        timeZone: response.data.properties?.timeZone,
        sheets: response.data.sheets?.map(sheet => ({
          sheetId: sheet.properties?.sheetId,
          title: sheet.properties?.title,
          index: sheet.properties?.index,
          rowCount: sheet.properties?.gridProperties?.rowCount,
          columnCount: sheet.properties?.gridProperties?.columnCount
        }))
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Get spreadsheet metadata failed', {
        duration,
        spreadsheetId,
        error: error.message
      });

      throw new ExternalServiceError(
        'GoogleSheets',
        `Failed to get spreadsheet metadata: ${error.message}`,
        error
      );
    }
  }

  /**
   * Find rows matching criteria
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} range - Range to search
   * @param {Function} predicate - Row matching function
   * @returns {Promise<Array<Object>>} Matching rows with indices
   */
  async findRows(spreadsheetId, range, predicate) {
    const values = await this.readValues(spreadsheetId, range);

    const matches = [];

    values.forEach((row, index) => {
      if (predicate(row, index)) {
        matches.push({
          index,
          values: row
        });
      }
    });

    this.logger.debug('Find rows complete', {
      spreadsheetId,
      range,
      totalRows: values.length,
      matches: matches.length
    });

    return matches;
  }

  /**
   * Update specific row
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {number} rowIndex - Row index (0-based)
   * @param {Array} values - Row values
   * @returns {Promise<Object>} Update result
   */
  async updateRow(spreadsheetId, sheetName, rowIndex, values) {
    const range = `${sheetName}!A${rowIndex + 1}`;
    return await this.writeValues(spreadsheetId, range, [values]);
  }

  /**
   * Append lead to sheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {Object} leadData - Lead data
   * @returns {Promise<Object>} Append result
   */
  async appendLead(spreadsheetId, sheetName, leadData) {
    const values = [[
      leadData.phoneNumber || '',
      leadData.name || '',
      leadData.company || '',
      leadData.sector || '',
      leadData.qualificationScore || 0,
      leadData.bantStage || '',
      leadData.currentState || '',
      leadData.timestamp || new Date().toISOString()
    ]];

    return await this.appendValues(spreadsheetId, `${sheetName}!A:H`, values);
  }

  /**
   * Health check
   * @returns {Promise<boolean>} True if healthy
   */
  async healthCheck() {
    try {
      await this.ensureInitialized();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default GoogleSheetsAdapter;
