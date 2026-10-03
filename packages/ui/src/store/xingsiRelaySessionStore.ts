import { create } from "zustand";
import type { UserInfo, XingsiRelayQuota } from "@zcode/shared";

export interface XingsiRelaySession {
  readonly email: string;
  readonly providerId: string;
  readonly quotaSessionId?: string;
  readonly quota?: XingsiRelayQuota | null;
}
interface XingsiRelaySessionState {
  session: XingsiRelaySession | null;
  establishSession: (session: XingsiRelaySession) => void;
  clearSession: () => void;
  updateQuota: (sessionId: string, quota: XingsiRelayQuota | null) => void;
}

// Each renderer starts signed out. Saved model credentials never establish a login session.
export function createXingsiRelaySessionStore() {
  return create<XingsiRelaySessionState>()((set) => ({
    session: null,
    establishSession: (session) => {
      const email = session.email.trim();
      const providerId = session.providerId.trim();
      if (!email || !providerId) throw new Error("登录信息不完整，请重新登录");
      set({
        session: Object.freeze({
          email,
          providerId,
          ...(session.quotaSessionId
            ? { quotaSessionId: session.quotaSessionId, quota: session.quota ?? null }
            : {}),
        }),
      });
    },
    clearSession: () => set({ session: null }),
    updateQuota: (sessionId, quota) =>
      set((state) =>
        state.session?.quotaSessionId === sessionId
          ? { session: Object.freeze({ ...state.session, quota }) }
          : {},
      ),
  }));
}
export const useXingsiRelaySessionStore = createXingsiRelaySessionStore();

export function requiresXingsiRelayLogin(
  isRelayClient: boolean,
  session: XingsiRelaySession | null,
): boolean {
  return isRelayClient && !session;
}

export function getXingsiRelayProfile(session: XingsiRelaySession | null): UserInfo | null {
  if (!session) return null;
  return { id: `xingsi:${session.email}`, username: session.email, displayName: session.email };
}
