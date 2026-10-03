import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createXingsiRelaySessionStore,
  getXingsiRelayProfile,
  requiresXingsiRelayLogin,
} from "../../ui/src/store/xingsiRelaySessionStore.js";

test("an old account's quota refresh never overwrites the current account", () => {
  const store = createXingsiRelaySessionStore();
  store
    .getState()
    .establishSession({
      email: "new@example.com",
      providerId: "new-provider",
      quotaSessionId: "new-session",
      quota: { groupName: "新套餐", remainingPercent: 100 },
    });
  store.getState().updateQuota("old-session", { groupName: "旧套餐", remainingPercent: 0 });
  assert.equal(store.getState().session?.quota?.groupName, "新套餐");
  store.getState().clearSession();
  store.getState().updateQuota("new-session", { groupName: "新套餐", remainingPercent: 50 });
  assert.equal(store.getState().session, null);
});

test("fresh process requires relay login independently of saved provider credentials", () => {
  const store = createXingsiRelaySessionStore();
  assert.equal(requiresXingsiRelayLogin(true, store.getState().session), true);
  assert.equal(requiresXingsiRelayLogin(false, store.getState().session), false);
});

test("verified relay account projects its actual email without carrying credentials", () => {
  const store = createXingsiRelaySessionStore();
  store
    .getState()
    .establishSession({ email: " customer@example.com ", providerId: "relay-account" });
  const session = store.getState().session;
  assert.deepEqual(session, { email: "customer@example.com", providerId: "relay-account" });
  assert.equal(getXingsiRelayProfile(session)?.displayName, "customer@example.com");
  assert.equal(requiresXingsiRelayLogin(true, session), false);
});

test("logout and a new process require login again", () => {
  const store = createXingsiRelaySessionStore();
  store.getState().establishSession({ email: "customer@example.com", providerId: "relay-account" });
  assert.equal(createXingsiRelaySessionStore().getState().session, null);
  store.getState().clearSession();
  assert.equal(getXingsiRelayProfile(store.getState().session), null);
  assert.equal(requiresXingsiRelayLogin(true, store.getState().session), true);
});

test("incomplete account configuration never establishes a session", () => {
  const store = createXingsiRelaySessionStore();
  assert.throws(() =>
    store.getState().establishSession({ email: "customer@example.com", providerId: "" }),
  );
  assert.equal(store.getState().session, null);
});
