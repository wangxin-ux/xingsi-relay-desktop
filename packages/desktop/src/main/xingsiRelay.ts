import { randomUUID } from "node:crypto";
import type {
  XingsiRelayLoginRequest,
  XingsiRelayLoginResult,
  XingsiRelayQuota,
} from "@zcode/shared";

const ORIGIN = "https://xing.xinxinyuntu.top";
interface RelayKey {
  id: number;
  key: string;
  status: string;
  group_id?: number;
  expires_at?: string | null;
  quota?: number;
  quota_used?: number;
}
interface Subscription {
  id?: number;
  status: string;
  group_id: number;
  expires_at?: string | null;
  daily_usage_usd?: number;
  weekly_usage_usd?: number;
  monthly_usage_usd?: number;
  group?: {
    name?: string;
    daily_limit_usd?: number | null;
    weekly_limit_usd?: number | null;
    monthly_limit_usd?: number | null;
  };
}

interface SubscriptionProgressInfo {
  subscription: Subscription;
  progress: {
    daily?: { limit_usd: number; used_usd: number } | null;
    weekly?: { limit_usd: number; used_usd: number } | null;
    monthly?: { limit_usd: number; used_usd: number } | null;
  };
}

export function projectXingsiProgress(items: SubscriptionProgressInfo[], groupId?: number) {
  return projectXingsiQuota(
    items.map(({ subscription, progress }) => ({
      ...subscription,
      daily_usage_usd: progress.daily?.used_usd,
      weekly_usage_usd: progress.weekly?.used_usd,
      monthly_usage_usd: progress.monthly?.used_usd,
      group: {
        ...subscription.group,
        daily_limit_usd: progress.daily?.limit_usd,
        weekly_limit_usd: progress.weekly?.limit_usd,
        monthly_limit_usd: progress.monthly?.limit_usd,
      },
    })),
    groupId,
  );
}

const quotaReaders = new Map<
  string,
  { expiresAt: number; read: () => Promise<XingsiRelayQuota | null> }
>();
export function projectXingsiQuota(
  subscriptions: Subscription[],
  groupId?: number,
): XingsiRelayQuota | null {
  const active = subscriptions.filter(
    (s) => s.status === "active" && (!s.expires_at || Date.parse(s.expires_at) > Date.now()),
  );
  const subscription = active.find((s) => s.group_id === groupId) ?? active[0];
  if (!subscription) return null;
  const group = subscription.group;
  const ratios = [
    [subscription.daily_usage_usd, group?.daily_limit_usd],
    [subscription.weekly_usage_usd, group?.weekly_limit_usd],
    [subscription.monthly_usage_usd, group?.monthly_limit_usd],
  ]
    .filter(
      (pair): pair is [number | undefined, number] => typeof pair[1] === "number" && pair[1] > 0,
    )
    .map(([used, limit]) => Math.max(0, Math.min(100, (1 - (used ?? 0) / limit) * 100)));
  return {
    groupName: group?.name || "当前订阅",
    remainingPercent: ratios.length ? Math.min(...ratios) : null,
  };
}
export async function readXingsiRelayQuota(sessionId: string): Promise<XingsiRelayQuota | null> {
  const reader = typeof sessionId === "string" ? quotaReaders.get(sessionId) : undefined;
  if (!reader || reader.expiresAt <= Date.now()) throw new Error("额度登录状态已过期，请重新登录");
  return reader.read();
}

export function selectUsableRelayKeys(
  keys: RelayKey[],
  groups: number[],
  now = Date.now(),
): RelayKey[] {
  return keys
    .filter(
      (key) =>
        key.status === "active" &&
        Boolean(key.key) &&
        (!key.expires_at || Date.parse(key.expires_at) > now) &&
        (!key.quota || (key.quota_used ?? 0) < key.quota),
    )
    .sort(
      (a, b) =>
        Number(groups.includes(b.group_id ?? -1)) - Number(groups.includes(a.group_id ?? -1)),
    );
}

/** 固定站点和拒绝重定向，避免账号凭据被发送到配置外的地址。 */
export async function loginXingsiRelay(
  input: XingsiRelayLoginRequest,
  request: typeof fetch = fetch,
): Promise<XingsiRelayLoginResult> {
  if (!input || typeof input.email !== "string" || !input.email.trim() || input.email.length > 320)
    throw new Error("请输入中转账号邮箱");
  if (input.tempToken ? !input.totpCode?.match(/^\d{6}$/) : !input.password)
    throw new Error("请输入密码或六位验证码");
  async function api<T>(path: string, token?: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await request(`${ORIGIN}${path}`, {
        method: body ? "POST" : "GET",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new Error("无法连接中转站，请检查网络后重试");
    }
    if (!response.ok) {
      if (path.includes("auth/login") && response.status === 401)
        throw new Error("邮箱或密码错误，请重试");
      if (response.status === 429) throw new Error("操作过于频繁，请稍后重试");
      if (response.status === 403)
        throw new Error("账号或密钥暂不可用，或站点要求安全验证，请联系站点管理员");
      throw new Error(`中转站请求失败（${response.status}），请重试`);
    }
    const payload = (await response.json()) as { code?: number; data?: T };
    if (typeof payload.code === "number" && payload.code !== 0)
      throw new Error("中转站未接受此次操作，请核对账号或验证码后重试");
    return (payload.data ?? payload) as T;
  }
  const auth = await api<{
    access_token?: string;
    expires_in?: number;
    requires_2fa?: boolean;
    temp_token?: string;
    user?: { email?: string };
  }>(
    input.tempToken ? "/api/v1/auth/login/2fa" : "/api/v1/auth/login",
    undefined,
    input.tempToken
      ? { temp_token: input.tempToken, totp_code: input.totpCode }
      : { email: input.email.trim(), password: input.password },
  );
  if (auth.requires_2fa && auth.temp_token)
    return { status: "two-factor", tempToken: auth.temp_token };
  if (!auth.access_token) throw new Error("登录未完成；站点可能要求安全验证，请联系站点管理员");
  const subscriptions = await api<Subscription[]>("/api/v1/subscriptions", auth.access_token);
  if (!Array.isArray(subscriptions)) throw new Error("无法读取套餐信息，请重试");
  const groups = subscriptions
    .filter(
      (s) => s.status === "active" && (!s.expires_at || Date.parse(s.expires_at) > Date.now()),
    )
    .map((s) => s.group_id);
  const keys: RelayKey[] = [];
  for (let page = 1; page <= 20; page++) {
    const list = await api<{ items: RelayKey[]; total: number }>(
      `/api/v1/keys?page=${page}&page_size=100`,
      auth.access_token,
    );
    if (!Array.isArray(list.items)) throw new Error("无法读取账号密钥，请重试");
    keys.push(...list.items);
    if (keys.length >= list.total || list.items.length < 100) break;
  }
  let candidates = selectUsableRelayKeys(keys, groups);
  if (!candidates.length && groups.length) {
    const created = await api<RelayKey>("/api/v1/keys", auth.access_token, {
      name: "星际中转站",
      group_id: groups[0],
    });
    candidates = selectUsableRelayKeys([created], groups);
  }
  if (!candidates.length)
    throw new Error("账号没有可用密钥或有效套餐，请先开通套餐或联系站点管理员");
  for (const key of candidates.slice(0, 10)) {
    let models: { id: string }[];
    try {
      models = await api<{ id: string }[]>("/v1/models", key.key);
    } catch {
      continue;
    }
    if (!Array.isArray(models)) continue;
    const modelIds = [
      ...new Set(
        models
          .map((model) => model.id)
          .filter(
            (id) =>
              typeof id === "string" &&
              id &&
              !/image|flux|dall|embedding|rerank|whisper|tts/i.test(id),
          ),
      ),
    ];
    if (modelIds.length) {
      const readQuota = async () => {
        const progress = await api<SubscriptionProgressInfo[]>(
          "/api/v1/subscriptions/progress",
          auth.access_token,
        );
        if (!Array.isArray(progress)) throw new Error("无法读取套餐额度");
        return projectXingsiProgress(progress, key.group_id);
      };
      let quota = projectXingsiQuota(subscriptions, key.group_id);
      try {
        quota = await readQuota();
      } catch {
        /* 额度查询失败不阻止登录。 */
      }
      const quotaSessionId = randomUUID();
      for (const [id, reader] of quotaReaders)
        if (reader.expiresAt <= Date.now()) quotaReaders.delete(id);
      if (quotaReaders.size >= 16) quotaReaders.delete(quotaReaders.keys().next().value!);
      quotaReaders.set(quotaSessionId, {
        expiresAt: Date.now() + Math.max(60, auth.expires_in ?? 86400) * 1000,
        read: readQuota,
      });
      return {
        status: "ready",
        email: auth.user?.email ?? input.email.trim(),
        apiKey: key.key,
        keyId: key.id,
        modelIds,
        subscriptionCount: groups.length,
        quotaSessionId,
        quota,
      };
    }
  }
  throw new Error("当前密钥没有可用文字模型，请检查套餐、密钥限制或稍后重试");
}
