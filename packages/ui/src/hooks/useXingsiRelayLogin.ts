import { usePlatform } from "./usePlatform.js";
import { useServices } from "./useServices.js";
import { useZCodeStore } from "@/store/StoreProvider.js";
import { encodeCustomModelValue } from "@/lib/zcodeCustomModelValue.js";
import type { XingsiRelayLoginRequest, XingsiRelayLoginResult } from "@zcode/shared";
import { useXingsiRelaySessionStore } from "../store/xingsiRelaySessionStore.js";

export function useXingsiRelayLogin() {
  const platform = usePlatform();
  const { providerSettingsService, settingService } = useServices();
  const markSuccess = useZCodeStore((state) => state.markApiKeyLoginSuccess);
  async function authenticate(request: XingsiRelayLoginRequest): Promise<XingsiRelayLoginResult> {
    if (!platform.loginXingsiRelay) throw new Error("请使用星际中转站 Windows 客户端登录");
    return platform.loginXingsiRelay(request);
  }
  async function configure(result: Extract<XingsiRelayLoginResult, { status: "ready" }>) {
    const providerName = `星际中转站 · ${result.email}`;
    const view = await providerSettingsService.getView();
    const existing = view.providers.find(
      (item) =>
        item.providerName === providerName || item.providerName === `星思天玑 · ${result.email}`,
    );
    const preferred =
      result.modelIds.find((id) => id.toLowerCase() === "glm-5.3") ?? result.modelIds[0];
    if (!preferred) throw new Error("账号没有可用模型，请检查套餐后重试");
    const orderedModels = [preferred, ...result.modelIds.filter((id) => id !== preferred)];
    const initialConfig = {
      access: { type: "api-key" as const, apiKey: result.apiKey },
      api: { type: "openai-chat-completions" as const, baseUrl: "https://xing.xinxinyuntu.top/v1" },
      personalModelIds: orderedModels,
      modelOrder: orderedModels,
      visibility: "visible" as const,
    };
    const providerId =
      existing?.providerId ??
      (await providerSettingsService.createPersonalProvider({ providerName, initialConfig }))
        .providerId;
    if (existing)
      await providerSettingsService.savePersonalProviderOverlay(providerId, initialConfig, {
        providerName,
        enabled: true,
      });
    // 切换账号只清理本客户端自动管理的旧账号配置，防止继续使用上个用户的密钥。
    for (const provider of view.providers) {
      if (
        (provider.providerName?.startsWith("星际中转站 · ") ||
          provider.providerName?.startsWith("星思天玑 · ")) &&
        provider.providerId !== providerId
      )
        await providerSettingsService.deletePersonalProvider(provider.providerId);
    }
    await settingService.update({
      providerFamilyDomain: "bigmodel",
      providerFamilyDomainUpdatedAt: Date.now(),
      providerFamilyDomainMigrated: true,
    });
    markSuccess(encodeCustomModelValue(providerId, preferred));
    useXingsiRelaySessionStore
      .getState()
      .establishSession({
        email: result.email,
        providerId,
        quotaSessionId: result.quotaSessionId,
        quota: result.quota,
      });
  }
  return { authenticate, configure };
}
