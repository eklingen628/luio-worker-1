import { SupabaseClient } from "@supabase/supabase-js";


export async function insertUserData(supabase: SupabaseClient<any, "public", any>, data): Promise<Response | null>  {


	try {
		const { error } = await supabase
			.from("fitbit_users")
			.upsert({
				user_id: data.user_id,
				access_token: data.access_token,
				refresh_token: data.refresh_token,
				expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
				token_type: data.token_type,
				scope: data.scope
			});

		if (error) {
			// Replace this in prod:
			// console.error("Insert failed: ", error);

			console.log({
				source: "supabase-upsert-user",
				message: error.message,
				user_id: data.user_id,
			});

			return new Response(error.message, { status: 500 });
		}
		} catch (err) {
			console.log({
				source: "supabase-upsert-user",
				message: (err as Error).message,
				stack: (err as Error).stack,
			});

		return new Response("Unexpected error", { status: 500 });
	}
	//Null indicates success
	return null;
		
}






export async function getAllUserData(supabase: SupabaseClient<any, "public", any>) {

	const { data, error } = await supabase.from("fitbit_users").select("*")

	if (error) {
		console.log({
				source: "supabase-select",
				message: error.message,
			});

		return new Response("Database select failed", { status: 500 });
	}

	return data;
}

