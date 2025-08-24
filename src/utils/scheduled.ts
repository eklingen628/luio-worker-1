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




// function binSearch(arr: string[], findValue: string) {

//   let first = 0
//   let last = arr.length - 1;  

//   while (first <= last) {
//     let mid = Math.floor((last + first) / 2)
//     if (arr[mid] === findValue) {
//       return mid;
//     }
//     else if ()

//   }

// }



type UsageDataValidation = {
  date_list: string[];
}

type NotWearingDatesByUser = {
  [user_id: string]: string[]
}

type NotWearingRow = {
  user_id: string,
  date_not_wearing: string
}



export async function getUsageObject(userData: FitBitUserIDData, dateNotUsedObj: NotWearingDatesByUser) {

  const {user_id, first_added} = userData;

  if (!Object.prototype.hasOwnProperty.call(dateNotUsedObj, user_id)) {
    dateNotUsedObj[user_id] = []
  }

  try {

    //get string array of days since the user was added to the db
    const daysSinceAdded = genDates(false, first_added, new Date().toISOString())

    if (!daysSinceAdded) {
      console.log("Error getting dates")
      return null;
    }

    // if (finalArr.length === 0) {
    //   finalArr.push(["user_id", "date_missing_data"])
    // }
    

   // return an array of dates. missing dates indicate user was not wearing device on those dates
    const activityResult = await executeQuery<UsageDataValidation>(`
      SELECT COALESCE(
        ARRAY_AGG(DISTINCT date_queried::text ORDER BY date_queried),
        '{}'
      ) AS date_list
      FROM daily_activity_summary
      WHERE user_id = $1   
      `, [user_id]);

    
    const activityResultDates = activityResult.rows[0].date_list

    if (activityResultDates.length === 0) {
      console.log("No dates whatsoever were found for user:", user_id)
      daysSinceAdded.forEach(day => dateNotUsedObj[user_id].push(day))
      return dateNotUsedObj
    }

    const dateSet = new Set(activityResultDates)   
    
    for (const day of daysSinceAdded) {
      if (!dateSet.has(day)) {
        dateNotUsedObj[user_id].push(day)
      }
    }

    return dateNotUsedObj;

  } catch (err) {
    console.log({
      source: 'createDateNotUsedObj',
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    throw err;
  }
}




function build2DArray(obj: NotWearingDatesByUser) {
  const userIDs = Object.keys(obj)
  const arr: string[][] = []

  for (const userID of userIDs) {
    const dates = obj[userID]
    for (const date of dates) {
      arr.push([userID, date])
    }
  }
  return arr
}


function buildValuesClauses(rows: string[][]) {
  const placeholders = rows.map((_, i) => `($${i*2+1}, $${i*2+2})`).join(', ');
  const flattened = rows.flat();
  return { placeholders, flattened };
}




/**
 * Adds rows to the not_wearing_device table
 * 
 * @param rows The 2d array to insert
 * @returns The rows that were added to the not_wearing_device table without conflict
 */
export async function insertMissingUsage(rows: string[][]): Promise<QueryResult<NotWearingRow> | null> {

  try {
    
    const { placeholders, flattened } = buildValuesClauses(rows);

    const rowsInserted = await executeQuery<NotWearingRow>(`
      INSERT INTO not_wearing_device
      (user_id, date_not_wearing)
      VALUES (${placeholders})
        ON CONFLICT (user_id, date_not_wearing) DO NOTHING
        RETURNING user_id, date_not_wearing
      `, flattened)

    
    if (rowsInserted.rowCount === 0) {
      console.log({
        source: 'insert-missing-usage',
        message: "No users found that miss usage",
      });
      return null;
    }

    return rowsInserted;
  
  } catch (err) {
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
 * Determine which users are not wearing their devices
 */
export async function runUsageValidation() {
  try {
    // Get all user data
    const data = await getAllUserData();

    if (!data) {
      console.error('No user data found when trying to get users for usage validation');
      return;
    }

    let dateNotUsedObj: NotWearingDatesByUser = {}
    let currObj: NotWearingDatesByUser | null;


    // Process data for each user
    for (const userData of data) {
      currObj = await getUsageObject(userData, dateNotUsedObj)
      if (currObj) {
        dateNotUsedObj = currObj
      }
    }

    const rows = build2DArray(dateNotUsedObj)

    const rowsInserted = await insertMissingUsage(rows)

    if (!rowsInserted) {
      console.error("Error, no rows were found")
    }
    else {
      const rowsForCSV = rowsInserted.rows.map(row => [row.user_id, row.date_not_wearing])
    
      csv.stringify(
        rowsForCSV,
        (err, output) => {
          if (err) throw err;
          notWearingDevice.attachments = [
            {
              filename: 'data.csv',
              content: output // can also use Buffer.from(output)
            }
          ]
          
          transporter.sendMail(notWearingDevice, (err, info) => {
            if (err) console.error(err);
            else console.log('Email sent:', info.response);
          });
        }
      );  
    }
  } catch (err) {
    throw err;
  }

}



async function runGetNotWearingDevice() {
  
  try {
    const result = await executeQuery<NotWearingRow>(`
      SELECT user_id, date_not_wearing
      FROM not_wearing_device
      `, [])


    if (result.rowCount === 0) {
      console.log({
        source: 'pool-select',
        message: "No users found",
      });
      return null;
    }

    return result.rows ?? [];
  } catch (err) {
    throw err;
  }
}