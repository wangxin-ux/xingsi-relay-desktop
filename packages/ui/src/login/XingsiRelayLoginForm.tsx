import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input.js";
import { Button } from "@/components/ui/button.js";
import { useXingsiRelayLogin } from "@/hooks/useXingsiRelayLogin.js";
import { ZCodeAboutLogo } from "@/components/ui/ZCodeAboutLogo.js";

export function XingsiRelayLoginForm({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const { authenticate, configure } = useXingsiRelayLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [tempToken, setTempToken] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await authenticate({
        email,
        password: tempToken ? undefined : password,
        tempToken,
        totpCode,
      });
      if (!mounted.current) return;
      if (result.status === "two-factor") {
        setTempToken(result.tempToken);
        setPassword("");
        return;
      }
      await configure(result);
      if (!mounted.current) return;
      setPassword("");
      setTotpCode("");
      setTempToken(undefined);
      await onSaved();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "登录失败，请重试");
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      aria-label="中转账号登录"
    >
      <div className="space-y-3 text-center">
        <ZCodeAboutLogo className="mx-auto" />
        <h1 className="text-ui-lg font-semibold">登录星际中转站</h1>
        <p className="text-ui-caption text-foreground-subtle">
          使用星思云图中转账号登录，模型自动配置。
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="xingsi-email" className="text-ui-base">
          账号邮箱
        </label>
        <Input
          id="xingsi-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy || Boolean(tempToken)}
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="xingsi-password" className="text-ui-base">
          {tempToken ? "两步验证验证码" : "密码"}
        </label>
        <Input
          id="xingsi-password"
          type={tempToken ? "text" : "password"}
          autoComplete={tempToken ? "one-time-code" : "current-password"}
          value={tempToken ? totpCode : password}
          onChange={(event) =>
            tempToken ? setTotpCode(event.target.value) : setPassword(event.target.value)
          }
          disabled={busy}
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-ui-caption text-destructive">
          {error}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={busy}>
        {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {busy ? "正在登录并配置模型…" : "登录并开始使用"}
      </Button>
      {tempToken ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setTempToken(undefined);
            setTotpCode("");
          }}
        >
          返回密码登录
        </Button>
      ) : null}
      <p className="text-ui-xs text-foreground-subtlest text-center">
        账号与套餐归属保持一致，模型费用由你的中转套餐结算。
      </p>
    </form>
  );
}
