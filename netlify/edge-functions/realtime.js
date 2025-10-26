let rooms = globalThis.__rooms || new Map();
globalThis.__rooms = rooms;

function getRoom(id) {
  if (!rooms.has(id)) rooms.set(id, new Set());
  return rooms.get(id);
}

function sendEvent(controller, data) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export default async (request, context) => {
  const { method, url } = request;
  const u = new URL(url);
  const projectId = u.searchParams.get("projectId");
  const clientId = u.searchParams.get("clientId") || "";

  if (method === "GET") {
    if (!projectId) return new Response("", { status: 400 });

    const stream = new ReadableStream({
      start(controller) {
        const room = getRoom(projectId);
        const entry = { controller };
        room.add(entry);
        sendEvent(controller, { type: "connected", projectId, clientId });
      },
      cancel() {
        const room = rooms.get(projectId);
        if (room) {
          for (const entry of room) {
            if (entry.controller.desiredSize === null) {
              room.delete(entry);
            }
          }
          if (room.size === 0) rooms.delete(projectId);
        }
      },
    });

    const headers = new Headers({
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    });

    return new Response(stream, { headers });
  }

  if (method === "POST") {
    const body = await request.json().catch(() => null);
    if (!body || body.type !== "project:update" || !body.projectId || typeof body.payload !== "string") {
      return new Response("", { status: 400 });
    }
    const room = rooms.get(body.projectId);
    if (!room) return new Response("", { status: 204 });
    const msg = {
      type: "project:update",
      projectId: body.projectId,
      clientId: body.clientId || "",
      payload: body.payload,
    };
    for (const entry of room) {
      try { sendEvent(entry.controller, msg); } catch {}
    }
    return new Response("", { status: 202 });
  }

  return new Response("", { status: 405 });
};
