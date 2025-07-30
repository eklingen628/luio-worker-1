import { getData, TokenExpiredError } from '../api/fetch';
import { refreshToken } from '../api/refresh';
import { getOneUserData, insertUserDataWithClient, getOneUserDataWithClient } from '../data/user';
import { FitBitUserIDData } from '../types';
import { ConfigType, DATA_HANDLERS, SCOPE_ACTIONS } from '../handlers/dataHandlers';
import { pool } from '../db/connection';

export async function processEntireUserDataForDate(
  userData: FitBitUserIDData, 
  dateQueried: string
): Promise<void> {
  let currentUserData = userData;
  
  for (const action of SCOPE_ACTIONS) {
    const result = await processUserDataForDateAndAction(currentUserData, dateQueried, action);
    
    // If token was refreshed, use the updated user data for subsequent actions
    if (result?.updatedUserData) {
      currentUserData = result.updatedUserData;
    }
  }
}

export async function processUserDataForDateAndAction(
  userData: FitBitUserIDData, 
  dateQueried: string,
  action: ConfigType
): Promise<{ updatedUserData?: FitBitUserIDData } | void> {
  try {
    const queriedData = await getData(userData, action, dateQueried);

    if (!queriedData) {
      console.log(`No data returned for ${action} on ${dateQueried} for user ${userData.user_id}`);
      return;
    }

    console.log(`Processing ${action} data for user ${userData.user_id} on ${dateQueried}`);
    
    const handler = DATA_HANDLERS[action];
    if (handler && handler.check(queriedData.dataFromQuery)) {
      await handler.insert(queriedData.dataFromQuery, dateQueried, userData.user_id);
    } else {
      console.log(`Type mismatch for ${action} data - expected data type not found`);
    }
  } catch (err) {
    // Handle token expiration
    if (err instanceof TokenExpiredError) {
      console.log("Token expired, refreshing and retrying...");
      
      try {
        // Refresh token to get new token data
        const refreshedTokenData = await refreshToken(userData);
        
        // Start a new database client for transaction
        const client = await pool.connect();
        
        try {
          // Begin transaction
          await client.query('BEGIN');
          
          // Insert the refreshed token data
          await insertUserDataWithClient(client, refreshedTokenData);
          
          // Get the updated user data with the new token
          const updatedUserData = await getOneUserDataWithClient(client, refreshedTokenData.user_id);
          
          // Commit the transaction
          await client.query('COMMIT');
          
          if (!updatedUserData) {
            console.log("Failed to get updated user data after token refresh");
            return;
          }

          // Retry the original API call with the new token
          const retryData = await getData(updatedUserData, action, dateQueried);
          
          if (!retryData) {
            console.log(`Retry failed for ${action} on ${dateQueried} for user ${userData.user_id}`);
            return;
          }

          console.log(`Processing ${action} data for user ${userData.user_id} on ${dateQueried} (retry)`);
          
          const handler = DATA_HANDLERS[action];
          if (handler && handler.check(retryData.dataFromQuery)) {
            await handler.insert(retryData.dataFromQuery, dateQueried, userData.user_id);
          } else {
            console.log(`Type mismatch for ${action} data - expected data type not found`);
          }
          
          // Return the updated user data so it can be used for subsequent actions
          return { updatedUserData };
          
        } catch (transactionErr) {
          // Rollback transaction on error
          await client.query('ROLLBACK');
          console.error("Transaction failed during token refresh:", transactionErr);
          return;
        } finally {
          // Always release the client
          client.release();
        }
      } catch (refreshErr) {
        console.error("Token refresh failed:", refreshErr);
        return;
      }
    } else {
      // Re-throw other errors
      throw err;
    }
  }
}