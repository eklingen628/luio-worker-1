import { UserToken, FitBitUserIDData } from "../types";
import { config } from "../config"

export async function refreshToken(userData: FitBitUserIDData): Promise<UserToken> {
  const tokenURL = new URL("https://api.fitbit.com/oauth2/token");

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", userData.refresh_token);

  const authString = `${config.fitbit.clientId}:${config.fitbit.clientSecret}`;
  const encodedAuth = Buffer.from(authString).toString('base64');

  try {
    const res = await fetch(tokenURL.toString(), {
      method: "POST",
      body,
      headers: {
        "Authorization": `Basic ${encodedAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      }
    });

    if (!res.ok) {
      const msg = await res.text();
      console.error("Fitbit refresh failed:", res.status, msg);
      throw new Error(`refresh-failed: ${res.status} - ${msg}`);
    }

    const refresh = await res.json() as UserToken;
    
    console.log("Token refreshed successfully for user:", refresh.user_id);
    return refresh;

  } catch (err: any) {
    console.error("Token refresh error:", err);
    throw new Error("Failed to refresh token from Fitbit API");
  }
}




