export class TokenStorage {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "PUT") {
      const body = await request.json();
      await this.state.storage.put("token", body);
      return new Response("Token stored", { status: 200 });
    }

    if (method === "GET") {
      const token = await this.state.storage.get("token");
      return new Response(JSON.stringify(token), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not allowed", { status: 405 });
  }
}
