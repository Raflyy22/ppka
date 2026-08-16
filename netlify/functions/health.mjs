export default async () => Response.json({
  ok: true,
  service: "ppka-simulator",
  timestamp: new Date().toISOString()
});
