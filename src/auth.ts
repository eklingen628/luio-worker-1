function arrayBufferToBase64(buffer: ArrayBuffer) {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function toBase64Url(base64: string) {
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generatePKCE() {
	const randomBuffer = crypto.getRandomValues(new Uint8Array(48)).buffer;

	const verifierString = toBase64Url(arrayBufferToBase64(randomBuffer));

	const encoder = new TextEncoder();

	const data = encoder.encode(verifierString);

	const chalBuffer = await crypto.subtle.digest('SHA-256', data);

	const challengeString = toBase64Url(arrayBufferToBase64(chalBuffer));

	return {
		code_verifier: verifierString,
		code_challenge: challengeString,
	};
}
