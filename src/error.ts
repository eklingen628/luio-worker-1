export class APIError extends Error {
	constructor(message: string, public details?: any) {
		super(message);
		this.name = "APIError";
	}
}


