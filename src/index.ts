import { DurableObject } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";
import { UserToken} from "./types";
import { insertSleepData } from "./sleep";
import { getAllUserData, insertUserData } from "./user";
import { refreshToken, calcTimeToRefresh } from "./refresh";
import { getData } from "./getData";
import { insertActivityData } from "./activity";
import { getQueryDate } from "./getQueryDate";
import { insertHRTimeSeries } from "./heart";







function arrayBufferToBase64( buffer: ArrayBuffer ) {
    let binary = "";
    const bytes = new Uint8Array( buffer );
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return btoa( binary );
}

function toBase64Url(base64: string) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}



async function generatePKCE() {
	const randomBuffer = crypto.getRandomValues(new Uint8Array(48)).buffer;

	const verifierString = toBase64Url(arrayBufferToBase64(randomBuffer))

	const encoder = new TextEncoder();

	const data = encoder.encode(verifierString);



	const chalBuffer = await crypto.subtle.digest("SHA-256", data);

	const challengeString = toBase64Url(arrayBufferToBase64(chalBuffer))


	return {
		code_verifier: verifierString,
		code_challenge: challengeString
	}

}




export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		


		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)




		const url = new URL(request.url)

		//for dev 
		const isDev = url.hostname.includes('localhost') || 
					url.hostname.includes('127.0.0.1') ||
					url.port !== '';

		//for dev
		const redirectUri = isDev 
			? `http://${url.host}/callback`
			: env.REDIRECT_URI;



		// index.ts – respond with login.html when the request is for “/”

		// `?raw` tells esbuild to bundle the file as a plain string.
		



		// Serve the page only on `/` (and `/index.html` for convenience)
		if (url.pathname === "/" || url.pathname === "/login.html") {
		// return new Response(loginHtml, {
		// 	headers: { "content-type": "text/html; charset=utf-8" },
		// });

			return env.ASSETS.fetch(request);
		}













		if (url.pathname === "/auth") {

			const fitbitAuthUrl = new URL("https://www.fitbit.com/oauth2/authorize")

			const { code_verifier, code_challenge } = await generatePKCE();


			fitbitAuthUrl.searchParams.set("client_id", env.FITBIT_CLIENT_ID)
			fitbitAuthUrl.searchParams.set("response_type", "code")
			fitbitAuthUrl.searchParams.set("scope", env.SCOPES_NEEDED)
			fitbitAuthUrl.searchParams.set("redirect_uri", redirectUri)
			fitbitAuthUrl.searchParams.set("code_challenge", code_challenge)
			fitbitAuthUrl.searchParams.set("code_challenge_method", "S256")


			//possibly replace using the headers cookie with a durable object
			const headers = new Headers();
			headers.set("Location", fitbitAuthUrl.toString());
			headers.set("Set-Cookie", `verifier=${code_verifier}; Path=/; Secure; HttpOnly; SameSite=Lax`);

			return new Response(null, {
				status: 302,
				headers
			});


			//return Response.redirect(fitbiturl.toString(), 302)

		}
		else if (url.pathname === "/callback") {


			const authcode: string | null = url.searchParams.get("code");

			if (!authcode) {
				return new Response("Missing code", { status: 400 });
			}

			let verifierString = null

			const cookie: string | null = request.headers.get("Cookie")
			if (cookie !== null) {
				verifierString = cookie
					.split("; ")
					.find(part => part.startsWith("verifier="))
					?.split("=")[1]
			}
			
			if (!verifierString) {
  				return new Response("Missing verifier", { status: 400 });
			}

			const tokenURL = new URL("https://api.fitbit.com/oauth2/token")

			const body = new URLSearchParams();
			body.set("client_id", env.FITBIT_CLIENT_ID);
			body.set("grant_type", "authorization_code");
			body.set("redirect_uri", redirectUri);
			body.set("code", authcode);
			body.set("code_verifier", verifierString);

			const authString = `${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`;
			const encodedAuth = btoa(authString); // base64-encode it


			const res = await fetch(tokenURL.toString(), {
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": `Basic ${encodedAuth}`
				}
			});

			// const data = await res.json() as UserToken

			// if (!data) return new Response("No token found", { status: 401 });
			
			let data: UserToken;

			try {
				data = await res.json() as UserToken;
			} 
			catch (err) {
				console.log({
					source: "res.json()",
					message: (err as Error).message,
			});

			return new Response("Error in Token Message received", { status: 400 });
			}
			if (!data) {
				console.log({
					source: "res.json()",
					message: "No token was received"
			});
				return new Response("No token was recieved", { status: 401 });
			}

			



			// const { error } = await supabase
			// 	.from("users")
			// 	.upsert([{
			// 		user_id: data.user_id,
			// 		access_token: data.access_token,
			// 		refresh_token: data.refresh_token,
			// 		expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
			// 		token_type: data.token_type,
			// 		scope: data.scope				
			// 	}])
			// if (error) {
			// 	console.error("Insert failed: ", error)

			// }


			let popRes = await insertUserData(supabase, data)

			if (popRes) {
				return popRes
			}



			

			let success = new URL("https://lutestworker.klingene.workers.dev/login-success")


			return env.ASSETS.fetch(success);

			// return new Response("Token found", { status: 302 });



		}

		// else if (url.pathname === "/get-steps") {
		// 	const raw = await env.TOKENS.get("some-user-id");
		// 	if (!raw) return new Response("No token found", { status: 401 });

		// 	console.log(raw)

		// 	const token = JSON.parse(raw);
		// 	const accessToken = token.access_token;

		// 	let activitySummaryURL = "activities/date/2025-06-29.json"
		// 	let granularSteps = "activities/steps/date/2025-06-29/1d/1min.json"
		// 	let heartRateTimeSeries = "activities/heart/date/2025-06-29/1m.json"
		// 	let heartRateVariabilityByDate = "hrv/date/2025-06-30.json"

			
		// 	const res = await fetch(`https://api.fitbit.com/1/user/-/${heartRateTimeSeries}`, {
		// 	headers: {
		// 		"Authorization": `Bearer ${accessToken}`
		// 	}
		// 	});

		// 	const data = await res.json();
		// 	return new Response(JSON.stringify(data), {
		// 	headers: { "Content-Type": "application/json" }
		// 	});


		// }




		else {
			return new Response("Not found", {status: 404})
		}


	},

	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {

		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)

		//by default, only 1000 rows may be returned

		const CRON_INTERVAL_HOURS = 2
		//insert try catch

		let data = await getAllUserData(supabase)

		
		for (const userData of data) {
			const isTimeToRefresh = calcTimeToRefresh(userData, CRON_INTERVAL_HOURS)

			if (isTimeToRefresh) {
				await refreshToken(userData, supabase, env)
			}

		}

		
		
		data = await getAllUserData(supabase)

		


		//for testing individual pulls
		// for (const userData of data) {

		// 	let testDate = new Date()
		// 	// testDate.setDate(testDate.getDate() - 3)

		// 	const dateQueried = getQueryDate(testDate)

		// 	const action = "getSleep"

		// 	const queriedData = await getData(supabase, userData, action, dateQueried)

		// 	console.log(queriedData?.dataFromQuery)

		// }

		

		

		for (const userData of data) {

			// let scopesObj = validateScope(userData)

			// console.log(scopesObj)

			// const scopesToRun = {
			// 	"activity": "getActivity"
			// 	"sleep": "getSleep"
			// }
			
		

			//possible config values at this time are "getSleep", "getActivity" or "getHeartRate"

			const scopeActions = ["getSleep", "getActivity", "getHeartRateTimeSeriesByDate"]

			let testDate = new Date()
			// testDate.setDate(testDate.getDate() - 3)

			const dateQueried = getQueryDate(testDate)

			for (const action of scopeActions) {
				
				const queriedData = await getData(supabase, userData, action, dateQueried)

				if (!queriedData) {
					// console.log("found error")
					continue
				}	
				
				console.log(queriedData?.dataFromQuery)

				

				switch (action) {
					case "getSleep":
						await insertSleepData(supabase, queriedData.dataFromQuery, queriedData.dateQueried, userData.user_id)
						break
					case "getActivity":
						await insertActivityData(supabase, queriedData.dataFromQuery, queriedData.dateQueried, userData.user_id)
						break
					case "getHeartRate":
						await insertHRTimeSeries(supabase, queriedData.dataFromQuery, queriedData.dateQueried, userData.user_id)
				}

			}



			// if (typeof(sleepData) === ) && !sleepData.success)) {
			// 	continue
			// }











			// getActivity
			// getHeart(userData)

		}

		

		
			
			


	}








} satisfies ExportedHandler<Env>;
