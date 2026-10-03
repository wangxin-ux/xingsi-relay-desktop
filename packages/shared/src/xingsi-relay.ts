export interface XingsiRelayQuota {
  groupName: string;
  remainingPercent: number | null;
}

export interface XingsiRelayLoginRequest {
  email: string;
  password?: string;
  tempToken?: string;
  totpCode?: string;
}

export type XingsiRelayLoginResult =
  | { status: "two-factor"; tempToken: string }
  | {
      status: "ready";
      email: string;
      apiKey: string;
      keyId: number;
      modelIds: string[];
      subscriptionCount: number;
      quotaSessionId?: string;
      quota?: XingsiRelayQuota | null;
    };
