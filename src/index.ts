import { DurableObject } from "cloudflare:workers";



interface Env {
  FITBIT_CLIENT_ID: string;
  FITBIT_CLIENT_SECRET: string;
  REDIRECT_URI: string;


}



/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
// export class MyDurableObject extends DurableObject<Env> {
// 	/**
// 	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
// 	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
// 	 *
// 	 * @param ctx - The interface for interacting with Durable Object state
// 	 * @param env - The interface to reference bindings declared in wrangler.jsonc
// 	 */
// 	constructor(ctx: DurableObjectState, env: Env) {
// 		super(ctx, env);
// 	}

// 	/**
// 	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
// 	 *  Object instance receives a request from a Worker via the same method invocation on the stub
// 	 *
// 	 * @param name - The name provided to a Durable Object instance from a Worker
// 	 * @returns The greeting to be sent back to the Worker
// 	 */
// 	async sayHello(name: string): Promise<string> {
// 		return `Hello, ${name}!`;
// 	}
// }



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

		const url = new URL(request.url)

		if (url.pathname === "/auth") {

			const fitbitAuthUrl = new URL("https://www.fitbit.com/oauth2/authorize")

			const { code_verifier, code_challenge } = await generatePKCE();


			fitbitAuthUrl.searchParams.set("client_id", env.FITBIT_CLIENT_ID)
			fitbitAuthUrl.searchParams.set("response_type", "code")
			fitbitAuthUrl.searchParams.set("scope", "activity heartrate sleep")
			fitbitAuthUrl.searchParams.set("redirect_uri", env.REDIRECT_URI)
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
			body.set("redirect_uri", env.REDIRECT_URI);
			body.set("code", authcode);
			body.set("code_verifier", verifierString);

			const authString = `${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`;
			const encodedAuth = btoa(authString); // base64-encode it


			const req = new Request(tokenURL.toString(), {
				method: "Post",
				body,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": `Basic ${encodedAuth}`

				}

			})


			const res = await fetch(req);

			const data = await res.json();




			// // change this to data.user_id later
			// const id = env.TOKENS.idFromName("some-unique-user-id");
			// const stub = env.TOKENS.get(id);

			// await stub.fetch("https://store/token", {
			// method: "PUT",
			// body: JSON.stringify(data),
			// });


			// const res2 = await stub.fetch("https://store/token", { method: "GET" });
			// const data2 = await res.json();
			// console.log("Stored token:", data);


			await env.TOKENS.put("some-user-id", JSON.stringify(data))








			return new Response("Token stored", { status: 200 });


		}



		else {
			return new Response("Not found", {status: 404})
		}

		console.log(request)





		return new Response();
	},
} satisfies ExportedHandler<Env>;
