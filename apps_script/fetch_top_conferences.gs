/**
 * Conference Calendar Updater
 * Fetches top-rated conferences from the CFP JSON endpoint
 * and updates the Google Sheet with the data.
 */

/**
 * Fetches top-rated CFPs and writes selected fields into the sheet.
 */
function importTopCFPs() {
  // 1. Fetch and parse JSON
  const url = 'https://raw.githubusercontent.com/lucjaulmes/cfp-timeline/master/cfp.json';
  try {
    const resp = UrlFetchApp.fetch(url);
    const jsonData = JSON.parse(resp.getContentText());
    
    Logger.log('JSON structure analyzed');
    
    // Extract the data based on the known structure
    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      throw new Error('Expected data array not found in JSON');
    }
    
    const allConfs = jsonData.data;
    const years = jsonData.years || [];
    const columns = jsonData.columns || [];
    const cfpColumns = jsonData.cfp_columns || [];
    
    Logger.log(`Found ${allConfs.length} conferences in the JSON data`);
    Logger.log(`Years: ${years.join(', ')}`);
    Logger.log(`Columns: ${columns.join(', ')}`);
    Logger.log(`CFP Columns: ${cfpColumns.join(', ')}`);
    
    // Get indexes for the relevant fields
    const acronymIndex = columns.indexOf('Acronym');
    const titleIndex = columns.indexOf('Title');
    const rankIndex = columns.indexOf('Rank');
    const fieldIndex = columns.indexOf('Field');
    
    // Log the found indexes
    Logger.log(`Field indexes: Acronym(${acronymIndex}), Title(${titleIndex}), Rank(${rankIndex}), Field(${fieldIndex})`);
    
    // Define the top ratings we want to filter for
    const topRatings = ['A++', 'A*', 'A+', 'A', 'A1', 'A2'];
    
    // First, let's see what rank values actually exist in the data
    const rankValues = new Set();
    allConfs.slice(0, 50).forEach(conf => {
      if (Array.isArray(conf) && rankIndex >= 0 && rankIndex < conf.length) {
        if (conf[rankIndex]) {
          rankValues.add(conf[rankIndex]);
        }
      }
    });
    
    Logger.log(`Found rank values: ${Array.from(rankValues).join(', ')}`);
    
    // Debug: Show an example conference
    if (allConfs.length > 0 && Array.isArray(allConfs[0])) {
      Logger.log(`Example conference data: ${JSON.stringify(allConfs[0])}`);
    }
    
    // Filter conferences based on rank (handling comma-separated values)
    const filtered = allConfs.filter(conf => {
      if (!Array.isArray(conf) || rankIndex < 0 || rankIndex >= conf.length) {
        return false;
      }
      
      const rankValue = conf[rankIndex];
      if (!rankValue) return false;
      
      // Parse the rank which might be a comma-separated list
      const rankString = String(rankValue);
      const ranks = rankString.split(',').map(r => r.trim());
      
      // Check if any of the ranks match our criteria
      for (const rank of ranks) {
        // Direct match
        if (topRatings.includes(rank)) {
          return true;
        }
        
        // Partial match
        for (const rating of topRatings) {
          if (rank.includes(rating)) {
            return true;
          }
        }
      }
      
      return false;
    });
    
    Logger.log(`Filtered to ${filtered.length} top-rated venues`);
    
    // If no matches found, use a fallback approach to take known A* conferences from the complete list
    let conferencesToUse = filtered;
    
    if (filtered.length === 0) {
      Logger.log("No conferences matched the rating criteria. Searching for key conferences...");
      
      // List of known top conferences to look for in the data
      const topConferenceAcronyms = [
        'SIGCOMM', 'MOBICOM', 'NSDI', 'OSDI', 'SOSP', 'CCS', 'INFOCOM', 
        'NDSS', 'Oakland', 'IMC', 'SIGMETRICS', 'CoNEXT', 'USENIX', 
        'AAAI', 'NeurIPS', 'ICML', 'ICLR', 'CVPR', 'ICCV', 'ACL', 'KDD'
      ];
      
      // Find conferences by acronym
      conferencesToUse = allConfs.filter(conf => {
        if (!Array.isArray(conf) || acronymIndex < 0 || acronymIndex >= conf.length) {
          return false;
        }
        
        const acronym = String(conf[acronymIndex] || '').toUpperCase();
        return topConferenceAcronyms.some(a => acronym === a || acronym.includes(a));
      });
      
      // If still not enough, fallback to first 20
      if (conferencesToUse.length < 5) {
        Logger.log(`Found only ${conferencesToUse.length} key conferences. Adding more from the beginning.`);
        const remainingNeeded = Math.min(20 - conferencesToUse.length, allConfs.length);
        const additionalConfs = allConfs
          .filter(conf => !conferencesToUse.includes(conf))
          .slice(0, remainingNeeded);
        
        conferencesToUse = conferencesToUse.concat(additionalConfs);
      }
      
      Logger.log(`Using ${conferencesToUse.length} conferences after fallback selection.`);
    }
    
    // Find the CFP data in each conference entry
    // Build rows of [conf_id, conf_name, abstract_deadline, notification_deadline, tags, website]
    const rows = conferencesToUse.map(conf => {
      if (!Array.isArray(conf)) {
        return ['', '', '', '', '', ''];
      }
      
      // Extract the basic data fields
      const confId = acronymIndex >= 0 && acronymIndex < conf.length ? String(conf[acronymIndex] || '') : '';
      const confName = titleIndex >= 0 && titleIndex < conf.length ? String(conf[titleIndex] || '') : '';
      const field = fieldIndex >= 0 && fieldIndex < conf.length ? String(conf[fieldIndex] || '') : '';
      
      // Get the most recent year's CFP data
      // The example shows these are arrays at indexes 5, 6, etc.
      let cfpData = null;
      let website = '';
      let abstractDeadline = '';
      let notificationDeadline = '';
      
      // Look for arrays that might contain CFP data (after the main fields)
      for (let i = 5; i < conf.length; i++) {
        if (Array.isArray(conf[i]) && conf[i].length > 10) {
          // This looks like CFP data
          cfpData = conf[i];
          break;
        } else if (typeof conf[i] === 'object' && conf[i] !== null) {
          // This might be an object with CFP data
          cfpData = conf[i];
          break;
        }
      }
      
      // If we found CFP data, extract relevant fields
      if (cfpData) {
        // From the example, submission deadline is at index 1, notification at index 2
        if (Array.isArray(cfpData)) {
          // Find the URL/website
          for (let i = 0; i < cfpData.length; i++) {
            const val = cfpData[i];
            if (typeof val === 'string' && isValidUrl(val)) {
              website = val;
              break;
            }
          }
          
          // Find the dates (submission and notification)
          // Based on the example, indexes 1 and 2 are likely deadlines
          if (cfpData.length > 2) {
            const submissionIndex = 1;
            const notificationIndex = 2;
            
            if (cfpData[submissionIndex] && isLikelyDate(cfpData[submissionIndex])) {
              abstractDeadline = formatDate(cfpData[submissionIndex]);
            }
            
            if (cfpData[notificationIndex] && isLikelyDate(cfpData[notificationIndex])) {
              notificationDeadline = formatDate(cfpData[notificationIndex]);
            }
          }
        } else if (typeof cfpData === 'object') {
          // Handle the case where CFP data is an object with properties
          if (cfpData.url) website = cfpData.url;
          if (cfpData.link) website = cfpData.link;
          if (cfpData.website) website = cfpData.website;
          
          if (cfpData.submission) abstractDeadline = formatDate(cfpData.submission);
          if (cfpData.abstract) abstractDeadline = formatDate(cfpData.abstract);
          if (cfpData.deadline) abstractDeadline = formatDate(cfpData.deadline);
          
          if (cfpData.notification) notificationDeadline = formatDate(cfpData.notification);
        }
      }
      
      return [
        confId,                  // conf_id
        confName,                // conf_name
        abstractDeadline,        // registration (abstract deadline)
        notificationDeadline,    // notification_deadline
        field,                   // tags
        website                  // website
      ];
    });
    
    // Filter out rows without required data
    const validRows = rows.filter(row => row[0] && row[1]); // At least need conference ID and name
    
    // 4. Write to the sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    
    // Clear existing data (except header)
    const lastRow = Math.max(sheet.getLastRow(), 1);
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 6).clearContent();
    }
    
    // Set header row if it doesn't exist
    const header = [['conf_id', 'conf_name', 'registration', 'notification', 'tags', 'website']];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues(header);
    }
    
    // Write data rows
    if (validRows.length > 0) {
      sheet.getRange(2, 1, validRows.length, 6).setValues(validRows);
    }
    
    // Format the sheet
    sheet.autoResizeColumns(1, 6);
    
    // Log success
    Logger.log(`Successfully updated sheet with ${validRows.length} conferences`);
    
    return { success: true, count: validRows.length, mode: filtered.length === 0 ? 'fallback' : 'filtered' };
  } catch (error) {
    Logger.log(`Error: ${error.toString()}`);
    Logger.log(`Stack: ${error.stack}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Checks if a value appears to be a date string
 */
function isLikelyDate(value) {
  if (!value) return false;
  
  // Convert to string if it's not already
  const strValue = String(value);
  
  // Simple date format check (YYYYMMDD - from the example)
  if (/^\d{8}$/.test(strValue)) {
    return true;
  }
  
  // Check for common date patterns
  const datePatterns = [
    /^\d{4}-\d{1,2}-\d{1,2}/, // YYYY-MM-DD
    /^\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY or DD/MM/YYYY
    /^\d{1,2}-\d{1,2}-\d{4}/, // MM-DD-YYYY or DD-MM-YYYY
    /^[A-Za-z]+\s+\d{1,2},\s+\d{4}/, // Month DD, YYYY
    /^\d{1,2}\s+[A-Za-z]+\s+\d{4}/ // DD Month YYYY
  ];
  
  // Check if it matches any date pattern
  for (const pattern of datePatterns) {
    if (pattern.test(strValue)) {
      return true;
    }
  }
  
  // Check if "20" or "202" appears (likely part of a year)
  if (/20\d{2}/.test(strValue)) {
    return true;
  }
  
  // Check if it's a valid date when parsed
  const parsed = new Date(strValue);
  return !isNaN(parsed.getTime());
}

/**
 * Checks if a value appears to be a URL
 */
function isValidUrl(value) {
  if (!value) return false;
  
  // Convert to string if it's not already
  const strValue = String(value);
  
  // Simple URL pattern check
  return /^https?:\/\//i.test(strValue) || 
         /^www\./i.test(strValue) || 
         /\.(com|org|edu|net|io|dev)($|\/)/i.test(strValue);
}

/**
 * Checks if an index is valid for an array of given length
 */
function isValidIndex(index, arrayLength) {
  return index >= 0 && index < arrayLength;
}

/**
 * Formats a date string from various formats to DD/MM/YYYY
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  
  try {
    // Ensure we're working with a string
    const strDateStr = String(dateStr);
    
    // Check if it's already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(strDateStr)) {
      return strDateStr;
    }
    
    // Handle YYYYMMDD format (from the example)
    if (/^\d{8}$/.test(strDateStr)) {
      const year = strDateStr.substring(0, 4);
      const month = strDateStr.substring(4, 6);
      const day = strDateStr.substring(6, 8);
      return `${day}/${month}/${year}`;
    }
    
    // Try to parse the date
    const date = new Date(strDateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      // Try to handle common non-standard formats
      // Format: Month Day, Year (e.g., "March 15, 2025")
      try {
        const monthDayYearMatch = strDateStr.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
        if (monthDayYearMatch) {
          const months = {
            'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
            'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
          };
          
          const monthStr = monthDayYearMatch[1].toLowerCase();
          const day = parseInt(monthDayYearMatch[2], 10);
          const year = parseInt(monthDayYearMatch[3], 10);
          
          if (months[monthStr] !== undefined && day >= 1 && day <= 31 && year >= 2000) {
            const newDate = new Date(year, months[monthStr], day);
            const formattedDay = newDate.getDate().toString().padStart(2, '0');
            const formattedMonth = (newDate.getMonth() + 1).toString().padStart(2, '0');
            return `${formattedDay}/${formattedMonth}/${newDate.getFullYear()}`;
          }
        }
      } catch (e) {
        Logger.log(`Error in regex matching date ${strDateStr}: ${e}`);
      }
      
      // If we get here, we couldn't parse the date
      return ''; // Return empty string for non-date values
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (e) {
    Logger.log(`Error formatting date ${dateStr}: ${e}`);
    return ''; // Return empty string on error
  }
}

/**
 * Creates a custom menu when opening the spreadsheet
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Conference Tools')
    .addItem('Import Top Conferences', 'importTopCFPs')
    .addToUi();
}

/**
 * Helper function to test the date formatting
 */
function testDateFormat() {
  const testDates = [
    '2025-03-11',
    '20240812',  // YYYYMMDD format
    '2024-08-29',
    '2025-01-15',
    'March 15, 2025',
    'Dec 31, 2024'
  ];
  
  testDates.forEach(date => {
    Logger.log(`${date} -> ${formatDate(date)}`);
  });
}

/**
 * Debug function to examine the structure of the first few conference entries
 */
function debugConferences() {
  const url = 'https://raw.githubusercontent.com/lucjaulmes/cfp-timeline/master/cfp.json';
  try {
    const resp = UrlFetchApp.fetch(url);
    const jsonData = JSON.parse(resp.getContentText());
    
    // Log the overall structure
    Logger.log(`Data type: ${typeof jsonData}`);
    Logger.log(`Has 'years': ${!!jsonData.years}, type: ${typeof jsonData.years}`);
    Logger.log(`Has 'columns': ${!!jsonData.columns}, type: ${typeof jsonData.columns}`);
    Logger.log(`Has 'cfp_columns': ${!!jsonData.cfp_columns}, type: ${typeof jsonData.cfp_columns}`);
    Logger.log(`Has 'data': ${!!jsonData.data}, type: ${typeof jsonData.data}`);
    
    if (jsonData.columns && Array.isArray(jsonData.columns)) {
      Logger.log(`Columns: ${jsonData.columns.join(', ')}`);
    }
    
    if (jsonData.cfp_columns && Array.isArray(jsonData.cfp_columns)) {
      Logger.log(`CFP Columns: ${jsonData.cfp_columns.join(', ')}`);
    }
    
    // Look at the first few data entries
    if (jsonData.data && Array.isArray(jsonData.data)) {
      Logger.log(`Data contains ${jsonData.data.length} entries`);
      
      for (let i = 0; i < Math.min(3, jsonData.data.length); i++) {
        const conf = jsonData.data[i];
        Logger.log(`Conference ${i + 1}: ${Array.isArray(conf) ? 'Array with ' + conf.length + ' items' : typeof conf}`);
        
        if (Array.isArray(conf)) {
          // If these are arrays, print them alongside their corresponding column names
          let allColumns = [];
          
          if (jsonData.columns && Array.isArray(jsonData.columns)) {
            for (let j = 0; j < Math.min(conf.length, jsonData.columns.length); j++) {
              allColumns.push(`${jsonData.columns[j]}: ${conf[j]}`);
            }
          }
          
          const cfpStartIdx = jsonData.columns ? jsonData.columns.length : 0;
          
          if (jsonData.cfp_columns && Array.isArray(jsonData.cfp_columns)) {
            for (let j = 0; j < Math.min(conf.length - cfpStartIdx, jsonData.cfp_columns.length); j++) {
              allColumns.push(`${jsonData.cfp_columns[j]}: ${conf[cfpStartIdx + j]}`);
            }
          }
          
          Logger.log(`Conference ${i + 1} data: ${allColumns.join(', ')}`);
        } else {
          Logger.log(`Conference ${i + 1} data: ${JSON.stringify(conf).substring(0, 300)}...`);
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    Logger.log(`Error: ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
} 