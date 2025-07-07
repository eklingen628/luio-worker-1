import { UserToken } from "./types";
import { insertUserData } from "./user";

//replace with types from supabase?
export async function refreshToken(userData, supabase: SupabaseClient<any, "public", any>, env: Env) {

	const tokenURL = new URL("https://api.fitbit.com/oauth2/token")

	const body = new URLSearchParams();
	body.set("grant_type", "refresh_token");
	body.set("refresh_token", userData.refresh_token);

	const authString = `${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`;
	const encodedAuth = btoa(authString); // base64-encode it

	let refresh;

	try {
	
	const res = await fetch(tokenURL.toString(), {
		method: "POST",
		body,
		headers: {
			"Authorization": `Basic ${encodedAuth}`,
			"Content-Type": "application/x-www-form-urlencoded",
		}
	})

	if (!res.ok) {
		const msg = await res.text();        // or res.json() if you expect JSON
		console.error("Fitbit refresh failed:", res.status, msg);
		throw new Error("refresh-failed");
	}
	refresh = await res.json() as UserToken;         // only reached on 2xx
	// …persist tokens…
	} 
	
	catch (err) {
	console.error("Token refresh error:", err);
		// decide: retry later or mark user for re-auth
	}

	await insertUserData(supabase, refresh)
			
}



//replace with types from supabase?
export function calcTimeToRefresh(userData, interval: number) {

	const timeMilli = (interval * 1.5 * 60 * 60 * 1000)

	const dateTimeFuture = new Date(Date.now() + timeMilli)
	const expiry = new Date(userData.expires_at)

	// if the expiration occurs prior to the defined future date
	return expiry < dateTimeFuture;

		
}

