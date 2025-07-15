import { APIError, FitbitApiResponse } from "./types";
import { SupabaseClient } from "@supabase/supabase-js";



export async function getData(supabase: SupabaseClient<any, "public", any>, data, config: string, dateQueried: string): 
Promise<{
    dateQueried: string;
    dataFromQuery: FitbitApiResponse;
} | null>  {

	if (!dateQueried || !data) {
		console.log("Date queried or data was undefined")
		return null
	}

    let query: string;

    switch (config) {
        case "getSleep":
            query = `/1.2/user/${data.user_id}/sleep/date/${dateQueried}.json`
            break
        case "getActivity":
            query = `/1/user/${data.user_id}/activities/date/${dateQueried}.json`
            break 
        case "getHeartRateTimeSeriesByDate":
            query =  `/1/user/${data.user_id}/activities/heart/date/${dateQueried}/1d.json`
            break
		// case "getProfile":
		// 	query = `/1/user/${data.user_id}/profile.json`
		// 	break
		default:
			return null
    }

	

	let res;

	try {
		res = await fetch(`https://api.fitbit.com/${query}`, {
			headers: {
				"Authorization": `Bearer ${data.access_token}`
			}
		});

		if (!res.ok) {
			const msg = await res.json();

			//potentially add handling of refreshing automatically
			// if (Array.isArray(msg?.errors) && msg?.errors.length === 1 && msg?.errors[0].errorType === "expired token") {
			// 	return 
			// }

			throw new APIError("get-data-failed", msg);      
			// console.log("Get data failed:", res.status, msg);
			// throw err;

			
		}

	}
	catch (err) {
		console.log(JSON.stringify({
			source: "getData: " + config,
			status: (err as any).details?.status ?? "unknown",
			message: (err as Error).message,
			details: (err as any).details, // optional; can omit if too noisy
		}));

		return null
	};



	const dataFromQuery = await res?.json() as FitbitApiResponse

	return {
        dateQueried,
		dataFromQuery

	}
		
}

