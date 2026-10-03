import assert from "node:assert/strict";
import test from "node:test";
import {
  loginXingsiRelay,
  selectUsableRelayKeys,
  projectXingsiQuota,
  projectXingsiProgress,
  readXingsiRelayQuota,
} from "../src/main/xingsiRelay.js";

test("quota uses the selected subscription and the tightest daily/weekly/monthly allowance", () => {
  const quota = projectXingsiQuota(
    [
      {
        status: "active",
        group_id: 1,
        daily_usage_usd: 0,
        group: { name: "其他套餐", daily_limit_usd: 100 },
      },
      {
        status: "active",
        group_id: 2,
        daily_usage_usd: 2,
        weekly_usage_usd: 15,
        monthly_usage_usd: 0,
        group: {
          name: "开发者 六合一 · 月卡组",
          daily_limit_usd: 10,
          weekly_limit_usd: 20,
          monthly_limit_usd: 100,
        },
      },
    ],
    2,
  );
  assert.deepEqual(quota, { groupName: "开发者 六合一 · 月卡组", remainingPercent: 25 });
});
test("quota is 100 for unused allowance and clamps exhaustion to zero", () => {
  const base = { status: "active", group_id: 1, group: { name: "月卡", daily_limit_usd: 10 } };
  assert.equal(projectXingsiQuota([{ ...base, daily_usage_usd: 0 }])?.remainingPercent, 100);
  assert.equal(projectXingsiQuota([{ ...base, daily_usage_usd: 15 }])?.remainingPercent, 0);
  assert.equal(projectXingsiQuota([]), null);
  assert.equal(projectXingsiQuota([{ status: "active", group_id: 1 }])?.remainingPercent, null);
});
test("unknown quota session cannot read another user's allowance", async () => {
  await assert.rejects(readXingsiRelayQuota("invalid-session"), /过期/);
});

test("progress supplies limits absent from subscription group and selects the user's group", () => {
  assert.deepEqual(
    projectXingsiProgress(
      [
        {
          subscription: { status: "active", group_id: 9, group: { name: "其他组" } },
          progress: { daily: { used_usd: 0, limit_usd: 10 } },
        },
        {
          subscription: { status: "active", group_id: 2, group: { name: "月卡组" } },
          progress: {
            daily: { used_usd: 2, limit_usd: 10 },
            weekly: { used_usd: 15, limit_usd: 20 },
          },
        },
      ],
      2,
    ),
    { groupName: "月卡组", remainingPercent: 25 },
  );
});

test("prefer subscribed keys and reject expired, disabled and exhausted keys", () => {
  const keys = [
    { id: 1, key: "test-1", status: "active", group_id: 1 },
    { id: 2, key: "test-2", status: "active", group_id: 2 },
    { id: 3, key: "test-3", status: "inactive", group_id: 2 },
    { id: 4, key: "test-4", status: "active", expires_at: "2000-01-01" },
    { id: 5, key: "test-5", status: "active", quota: 1, quota_used: 1 },
  ];
  assert.deepEqual(
    selectUsableRelayKeys(keys, [2]).map((key) => key.id),
    [2, 1],
  );
});

test("login discovers models with the user's own key, without exposing JWT", async () => {
  const calls: string[] = [];
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    const payload = url.endsWith("auth/login")
      ? { access_token: "test-jwt", user: { email: "user@example.test" } }
      : url.endsWith("subscriptions")
        ? [{ status: "active", group_id: 2 }]
        : url.endsWith("subscriptions/progress")
          ? [
              {
                subscription: { status: "active", group_id: 2, group: { name: "月卡" } },
                progress: { daily: { used_usd: calls.length > 5 ? 4 : 0, limit_usd: 10 } },
              },
            ]
          : url.includes("keys?")
            ? { items: [{ id: 8, key: "test-key", status: "active", group_id: 2 }], total: 1 }
            : { data: [{ id: "glm-5.3" }, { id: "image-model" }] };
    if (url.endsWith("models"))
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-key");
    return Response.json(url.endsWith("models") ? payload : { code: 0, data: payload });
  };
  const result = await loginXingsiRelay(
    { email: "user@example.test", password: "test-only" },
    request,
  );
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.deepEqual(result.modelIds, ["glm-5.3"]);
    assert.equal(result.quota?.remainingPercent, 100);
    assert.equal((await readXingsiRelayQuota(result.quotaSessionId!))?.remainingPercent, 60);
  }
  assert.equal(JSON.stringify(result).includes("test-jwt"), false);
  assert.equal(calls.length, 6);
});

test("2FA challenge does not request account keys", async () => {
  const result = await loginXingsiRelay(
    { email: "user@example.test", password: "test-only" },
    async () =>
      Response.json({ code: 0, data: { requires_2fa: true, temp_token: "test-challenge" } }),
  );
  assert.deepEqual(result, { status: "two-factor", tempToken: "test-challenge" });
});

test("failed login reports a safe error instead of response credentials", async () => {
  await assert.rejects(
    loginXingsiRelay({ email: "user@example.test", password: "test-only" }, async () =>
      Response.json({ message: "secret-test-key" }, { status: 401 }),
    ),
    /邮箱或密码错误/,
  );
});

test("no existing key creates one in the user's active subscription group", async () => {
  let created = false;
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("auth/login"))
      return Response.json({
        data: { access_token: "test-jwt", user: { email: "user@example.test" } },
      });
    if (url.endsWith("subscriptions"))
      return Response.json({ data: [{ status: "active", group_id: 2 }] });
    if (url.endsWith("subscriptions/progress")) return Response.json({ data: [] });
    if (init?.method === "POST") {
      created = true;
      assert.equal(JSON.parse(String(init.body)).group_id, 2);
      return Response.json({ data: { id: 10, key: "test-key", status: "active", group_id: 2 } });
    }
    if (url.includes("keys?")) return Response.json({ data: { items: [], total: 0 } });
    return Response.json({ data: [{ id: "glm-5.3" }] });
  };
  assert.equal(
    (await loginXingsiRelay({ email: "user@example.test", password: "test-only" }, request)).status,
    "ready",
  );
  assert.equal(created, true);
});
