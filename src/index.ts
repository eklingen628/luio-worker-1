import { DurableObject } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";
import { UserToken } from "./types";


interface Env {
  FITBIT_CLIENT_ID: string;
  FITBIT_CLIENT_SECRET: string;
  REDIRECT_URI: string;


}




// export class TokenStorage extends DurableObject<Env>{

//   constructor(ctx: DurableObjectState, env: Env) {
//     super(ctx, env)
//   }

//   async fetch(request: Request): Promise<Response> {
//     const url = new URL(request.url);
//     const method = request.method;

//     if (method === "PUT") {
//       const body = await request.json();
//       await this.ctx.storage.put("token", body);
//       return new Response("Token stored", { status: 200 });
//     }

//     if (method === "GET") {
//       const token = await this.ctx.storage.get("token");
//       return new Response(JSON.stringify(token), {
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     return new Response("Not allowed", { status: 405 });
//   }
// }





//replace with types from supabase?
function refreshToken(userData) {

	const currentDate = new Date(Date.now() + (20000 * 1000))
	const date = new Date(userData.expires_at)


	console.log(currentDate)
	console.log(date)

	if (currentDate > date) {
		console.log("yes")
	}
	else {
		console.log("no")
	} 
				
}





//replace with types from supabase?
function getSleep(userData) {

	const currentDate = new Date(Date.now())




				
}






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
			fitbitAuthUrl.searchParams.set("scope", "activity cardio_fitness electrocardiogram heartrate irregular_rhythm_notifications location nutrition oxygen_saturation profile respiratory_rate settings sleep social temperature weight")
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


			console.log("CALLBACK FLOW");
			console.log("received code:", authcode);
			console.log("verifier from cookie:", verifierString);
			
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



			try {
				const { error } = await supabase
					.from("fitbit_users")
					.upsert([{
					user_id: data.user_id,
					access_token: data.access_token,
					refresh_token: data.refresh_token,
					expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
					token_type: data.token_type,
					scope: data.scope
					}]);

				if (error) {
					// Replace this in prod:
					// console.error("Insert failed: ", error);

					console.log({
						source: "supabase-upsert",
						message: error.message,
						user_id: data.user_id,
					});

					return new Response(error.message, { status: 500 });
				}
				} catch (err) {
					console.log({
						source: "supabase-upsert",
						message: (err as Error).message,
						stack: (err as Error).stack,
					});

				return new Response("Unexpected error", { status: 500 });
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


	}

	// async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {


	// 	const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)

	// 	//by default, only 1000 rows may be returned


	// 	//insert try catch

	// 	const { data, error } = await supabase.from("fitbit_users").select("*")

	// 	// console.log(data)

	// 	if (error) {
	// 		console.log({
	// 				source: "supabase-select",
	// 				message: error.message,
	// 			});

	// 		return new Response("Database select failed", { status: 500 });
	// 	}

	// 	data?.forEach(userData => {

	// 		refreshToken(userData)

	// 		getSleep(userData)
	// 		// checkActivity
	// 		// checkHeartRate(userData)
			
			
	// 	})

	// }








} satisfies ExportedHandler<Env>;
