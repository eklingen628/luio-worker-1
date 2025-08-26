import { getAllUserData } from '../data/user';
import { genDates } from '../utils/date';
import { processUserData } from '../workflow/processors';
import { transporter, scopeEmail, notWearingDevice, sendEmail } from './email';
import { validateScope } from './scope';
import { executeQuery } from '../db/connection';
import { FitBitUserIDData } from '../types';
import { DatabaseError, QueryResult } from 'pg';
import csv from 'csv'
import fs from 'fs'






type UsageDataValidation = {
  date_list: string[];
}

// New types for comprehensive missing data tracking
type MissingDataRow = {
  user_id: string;
  date_missing: string;
  missing_activity: boolean;
  missing_sleep: boolean;
  missing_hrv: boolean;
}

type MissingDataByUser = {
  [user_id: string]: MissingDataRow[]
}

/**
 * Enhanced function to check comprehensive missing data across multiple data types
 */
export async function getComprehensiveUsageObject(userData: FitBitUserIDData): Promise<MissingDataRow[] | null> {
  const {user_id, first_added} = userData;

  try {
    const daysSinceAdded = genDates(false, first_added, new Date().toISOString())
    
    if (!daysSinceAdded) {
      console.log("Error getting dates")
      return null;
    }

    // Check activity data
    const activityResult = await executeQuery<UsageDataValidation>(`
      SELECT COALESCE(
        ARRAY_AGG(DISTINCT date_queried::text ORDER BY date_queried::text),
        '{}'
      ) AS date_list
      FROM daily_activity_summary
      WHERE user_id = $1 AND steps > 250 AND resting_heart_rate IS NOT NULL 
      `, [user_id]);

    // Check sleep data  
    const sleepResult = await executeQuery<UsageDataValidation>(`
      SELECT COALESCE(
        ARRAY_AGG(DISTINCT date_queried::text ORDER BY date_queried::text),
        '{}'
      ) AS date_list
      FROM sleep_log
      WHERE user_id = $1   
      `, [user_id]);

    // Check HRV data
    const hrvResult = await executeQuery<UsageDataValidation>(`
      SELECT COALESCE(
        ARRAY_AGG(DISTINCT date_queried::text ORDER BY date_queried::text),
        '{}'
      ) AS date_list
      FROM hrv_summary
      WHERE user_id = $1   
      `, [user_id]);

    const activityDates = new Set(activityResult.rows[0].date_list);
    const sleepDates = new Set(sleepResult.rows[0].date_list);
    const hrvDates = new Set(hrvResult.rows[0].date_list);
    
    // Build comprehensive missing data object
    const missingData: MissingDataRow[] = [];

    for (const day of daysSinceAdded) {
      const missingActivity = !activityDates.has(day);
      const missingSleep = !sleepDates.has(day);
      const missingHrv = !hrvDates.has(day);
      
      // Only create row if at least one data type is missing
      if (missingActivity || missingSleep || missingHrv) {
        missingData.push({
          user_id,
          date_missing: day,
          missing_activity: missingActivity,
          missing_sleep: missingSleep,
          missing_hrv: missingHrv
        });
      }
    }

    return missingData;


  } catch (err) {
    console.log({
      source: 'getComprehensiveUsageObject',
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    throw err;
  }
}


/**
 * Builds a 2D array from comprehensive missing data for database insertion
 */
function buildComprehensiveMissingDataArray(missingDataByUser: MissingDataByUser): MissingDataRow[] {
  const allMissingData: MissingDataRow[] = []

  const UserIDs = Object.keys(missingDataByUser)
  
  for (const userID of UserIDs) {
    const userMissingData = missingDataByUser[userID]
    allMissingData.push(...userMissingData)
  }
  
  return allMissingData
}

/**
 * Builds SQL placeholders for comprehensive missing data insertion
 */
function buildComprehensiveValuesClauses(rows: MissingDataRow[]) {
  const placeholders = rows.map((_, i) => 
    `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`
  ).join(', ');
  
  const flattened = rows.flatMap(row => [
    row.user_id, 
    row.date_missing, 
    row.missing_activity, 
    row.missing_sleep, 
    row.missing_hrv
  ]);
  
  return { placeholders, flattened };
}


/**
 * Adds comprehensive missing data rows to the missing_data_tracking table
 * 
 * @param rows The array of MissingDataRow objects to insert
 * @returns The rows that were added to the missing_data_tracking table without conflict
 */
export async function insertComprehensiveMissingData(rows: MissingDataRow[]): Promise<QueryResult<MissingDataRow> | null> {

  try {
    if (!rows || rows.length === 0) {
      console.log({
        source: 'insertComprehensiveMissingData',
        message: 'No rows provided for insertion'
      });
      return null;
    }
    
    const { placeholders, flattened } = buildComprehensiveValuesClauses(rows);

    const rowsInserted = await executeQuery<MissingDataRow>(`
      INSERT INTO missing_data_tracking
      (user_id, date_missing, missing_activity, missing_sleep, missing_hrv)
      VALUES ${placeholders}
        ON CONFLICT (user_id, date_missing) DO NOTHING
        RETURNING user_id, date_missing, missing_activity, missing_sleep, missing_hrv
      `, flattened)

    
    if (rowsInserted.rowCount === 0) {
      console.log({
        source: 'insert-comprehensive-missing-data',
        message: "No missing data rows were inserted",
      });
      return null;
    }

    return rowsInserted;
  
  } catch (err) {
    console.log({
      source: 'insertComprehensiveMissingData',
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    throw err
  }

}

export async function runImport() {
  // TODO: Implement your daily scheduled logic here
  // Example: Query users, refresh tokens, fetch/insert data, etc.
  console.log('Running scheduled import...');


  try {
    // Get all user data
    const data = await getAllUserData();

    if (!data) {
      console.error('No user data found after token refresh');
      return;
    }

    const endDate = new Date();
    const startDate = new Date(endDate);
    //set the start date to 3 days ago
    startDate.setDate(startDate.getDate() - 3);

    const dates = genDates(false, startDate.toDateString(), endDate.toISOString());

    if (!dates) {
      console.log(`Error in generating dates startdate: ${startDate.toISOString()} enddate: ${endDate.toISOString()}`);
      return;
    }

    // Process data for each user
    for (const userData of data) {
      const scopeResults = validateScope(userData);

      if (!scopeResults.allScopesPresent) {
        console.log(`User ${userData.user_id} has missing scopes: ${scopeResults.missingScopes.join(', ')}. Email was sent.`);
        const sentMessageInfo = await sendEmail(scopeEmail);
        console.log(`Sent message info: ${sentMessageInfo}`);
        continue;
      }
      
      await processUserData(userData, dates, 'all');
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Enhanced validation function that tracks comprehensive missing data across all data types
 */
export async function runComprehensiveUsageValidation() {
  try {
    // Get all user data
    const data = await getAllUserData();

    if (!data) {
      console.error('No user data found when trying to get users for comprehensive usage validation');
      return;
    }

    let missingDataByUser: MissingDataByUser = {}
    let userMissingData: MissingDataRow[] | null;

    // Process data for each user
    for (const userData of data) {
      userMissingData = await getComprehensiveUsageObject(userData)
      if (userMissingData) {
        missingDataByUser[userData.user_id] = userMissingData
      }
    }

    const allMissingData = buildComprehensiveMissingDataArray(missingDataByUser)

    const rowsInserted = await insertComprehensiveMissingData(allMissingData)

    if (!rowsInserted) {
      console.log("No comprehensive missing data rows were found - all data appears to be present")
    }
    else {
      console.log(`Successfully inserted ${rowsInserted.rowCount} comprehensive missing data records`)
      
      // Create CSV export for newly discovered missing data
      const rowsForCSV = rowsInserted.rows.map(row => [
        row.user_id, 
        new Date(row.date_missing).toISOString().split('T')[0], // Convert to YYYY-MM-DD
        row.missing_activity ? 'true' : 'false',
        row.missing_sleep ? 'true' : 'false', 
        row.missing_hrv ? 'true' : 'false'
      ])
    
      console.log("About to call csv.stringify");
      // Create CSV manually
      const csvHeader = 'user_id,date_missing,missing_activity,missing_sleep,missing_hrv\n';
      const csvRows = rowsForCSV.map(row => row.join(',')).join('\n');
      const csvContent = csvHeader + csvRows;

      notWearingDevice.attachments = [
        {
          filename: 'missing_data.csv',
          content: csvContent
        }
      ];

      try {
        await sendEmail(notWearingDevice);
        console.log('Email sent successfully!');
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }
  } catch (err) {
    throw err;
  }
}





