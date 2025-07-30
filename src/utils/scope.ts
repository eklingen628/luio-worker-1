import { FitBitUserIDData } from "../types";

export function validateScope(userData: FitBitUserIDData) {

	const requiredScopes = (process.env.SCOPES_NEEDED || "").split(" ").map(s => s.trim()).filter(s => s.length > 0)

	const presentScopes = (userData?.scope ?? "").split(" ").map(s => s.trim()).filter(s => s.length > 0);
	const user_id = userData?.user_id ?? "user_id_not_found"
	
	const missingScopes = requiredScopes.filter(
      (scope: string) => !presentScopes.includes(scope)
    );

	const availableScopes = requiredScopes.filter(
      (scope: string) => presentScopes.includes(scope)
    );

	let allScopesPresent = missingScopes.length === 0
	return {
		user_id,
		allScopesPresent,
		availableScopes,
		missingScopes,
	}
}


