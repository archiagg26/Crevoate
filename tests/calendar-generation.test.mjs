import assert from "node:assert/strict";
import test from "node:test";

test("calendar generation verifies the owner and filters model output", async (t) => {
  const owner = "10000000-0000-4000-8000-000000000001";
  const campaignId = "20000000-0000-4000-8000-000000000002";
  const env = {
    SUPABASE_URL: "https://db.example.test",
    SUPABASE_ANON_KEY: "test-public-key",
    CALENDAR_AI_URL: "https://model.example.test/completions",
    CALENDAR_AI_KEY: "test-provider-key",
    CALENDAR_AI_MODEL: "test-model",
  };
  let handler;
  let ownCampaign = true;
  let providerCalls = 0;
  t.after(() => {
    delete globalThis.Deno;
  });
  globalThis.Deno = {
    env: { get: (key) => env[key] },
    serve: (callback) => {
      handler = callback;
    },
  };
  t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = new URL(input);
    if (url.pathname === "/auth/v1/user") {
      return options.headers.authorization === "Bearer test-session"
        ? Response.json({ id: owner })
        : Response.json({}, { status: 401 });
    }
    if (url.pathname === "/rest/v1/campaigns") {
      assert.equal(url.searchParams.get("user_id"), "eq." + owner);
      return Response.json(
        ownCampaign
          ? [
              {
                data: {
                  brand: "North",
                  product: "Desk objects",
                  audience: "Designers",
                  start: "2030-12-01",
                  duration: 9,
                  budget: 25000,
                  channels: ["Instagram"],
                },
              },
            ]
          : [],
      );
    }
    providerCalls++;
    const body = JSON.parse(options.body);
    const inputBrief = JSON.parse(body.messages[1].content);
    assert.equal(inputBrief.product, "Desk objects");
    assert.equal(inputBrief.audience, "Designers");
    assert.equal(inputBrief.end, "2030-12-09");
    const valid = {
      idea: "Desk tour",
      date: "2030-12-03",
      time: "11:00",
      platform: "Instagram",
      format: "Reel",
    };
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              entries: [valid, { ...valid, date: "2030-12-10" }],
            }),
          },
        },
      ],
    });
  });
  await import("../supabase/functions/campaign-calendar/index.ts");
  const request = (token) =>
    new Request("https://edge.example.test", {
      method: "POST",
      headers: { authorization: "Bearer " + token },
      body: JSON.stringify({ campaignId }),
    });
  assert.equal((await handler(request("bad-session"))).status, 401);
  ownCampaign = false;
  assert.equal((await handler(request("test-session"))).status, 404);
  ownCampaign = true;
  const response = await handler(request("test-session"));
  assert.equal(response.status, 200);
  const { entries } = await response.json();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].status, "Draft");
  assert.equal(entries[0].origin, "ai");
  assert.equal(providerCalls, 1);
});
