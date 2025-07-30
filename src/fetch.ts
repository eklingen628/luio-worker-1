import { FitbitApiResponse, FitBitApiError, FitBitUserIDData } from "./types";
import { refreshToken } from "./refresh";
import { getOneUserData } from "./user";
import { ConfigType, DATA_HANDLERS } from "./dataHandlers";




class TokenExpiredError extends Error {
	constructor(public fitbitError: FitBitApiError) {
		super("Access token expired");
		this.name = "TokenExpiredError";
	}
}

class FitbitApiCallError extends Error {
	constructor(public fitbitError: FitBitApiError, public statusCode: number) {
		super(`Fitbit API call failed with status ${statusCode}`);
		this.name = "FitbitApiCallError";
	}
}




async function makeApiCall(query: string, accessToken: string): Promise<FitbitApiResponse> {
	const res = await fetch(`https://api.fitbit.com${query}`, {
		headers: {
			"Authorization": `Bearer ${accessToken}`
		}
	});

	if (!res.ok) {
		const msg = await res.json() as FitBitApiError;
		
		// Check for specific error types
		if (msg.errors?.[0]?.errorType === "expired_token") {
			throw new TokenExpiredError(msg);
		}
		
		throw new FitbitApiCallError(msg, res.status);
	}

	return await res.json() as FitbitApiResponse;
}

export async function getData(data: FitBitUserIDData, config: ConfigType, dateQueried: string): 
Promise<{
    dateQueried: string;
    dataFromQuery: FitbitApiResponse;
} | null> {

	if (!dateQueried || !data?.user_id || !data?.access_token) {
		console.log("Missing required fields: dateQueried, user_id, or access_token");
		return null;
	}

	const query = DATA_HANDLERS[config].apiCall(data.user_id, dateQueried);

	try {
		const dataFromQuery = await makeApiCall(query, data.access_token);
		return {
			dateQueried,
			dataFromQuery
		};
	}
	catch (err) {
		// Handle expired token specifically
		if (err instanceof TokenExpiredError) {
			console.log("Token expired, refreshing and retrying...");


			// for logging only. delete after testing
			console.log("Old token:", data.access_token.substring(0, 10) + "...");
			
			// Refresh token and insert new token into fitbit_users table
			await refreshToken(data);
			
			// Get the updated user data with the new token
			const updatedUserData = await getOneUserData(data.user_id);
			if (!updatedUserData) {
				console.log("Failed to get updated user data after token refresh");
				return null;
			}
			



			// for logging only. delete after testing	
			console.log("New token:", updatedUserData.access_token.substring(0, 10) + "...");
			
			try {
				const dataFromQuery = await makeApiCall(query, updatedUserData.access_token);
				return {
					dateQueried,
					dataFromQuery
				};
			} catch (retryErr) {




				// for logging only. delete after testing
				console.log("Retry failed with new token. Error:", retryErr);
				console.log(JSON.stringify({
					source: "getData: retry failed",
					errorType: retryErr instanceof TokenExpiredError ? "token_expired" : "api_error",
					message: (retryErr as Error).message,
				}));
				return null;
			}
		}

		// Handle other Fitbit API errors
		if (err instanceof FitbitApiCallError) {
			console.log(JSON.stringify({
				source: "getData: " + config,
				statusCode: err.statusCode,
				errorType: err.fitbitError.errors?.[0]?.errorType,
				message: err.fitbitError.errors?.[0]?.message,
			}));
			return null;
		}

		// Handle unexpected errors
		console.log(JSON.stringify({
			source: "getData: " + config,
			errorType: "unexpected_error",
			message: (err as Error).message,
		}));
		return null;
	}
}
