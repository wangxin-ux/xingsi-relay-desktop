import assert from "node:assert/strict";
import test from "node:test";
import { buildIdentitySection } from "../../../apps/zcode-cli/packages/core/src/context/sections/identity.js";
import { buildCliPrefixSection } from "../../../apps/zcode-cli/packages/core/src/context/sections/cli-prefix.js";
import { resolvePluginDisplayName } from "@zcode/shared";
import { formatProviderModelLabel } from "../../ui/src/v4/composer/modelTriggerDisplay.js";

test("agent identity and CLI prefix use the relay assistant name", () => {
  for (const content of [buildIdentitySection().content, buildCliPrefixSection().content]) {
    assert.match(content, /星思中转助手/);
    assert.doesNotMatch(content, /ZCode/i);
    assert.match(content, /introduce yourself as 星思中转助手/);
  }
  assert.match(buildIdentitySection().content, /authorized security testing/);
});

test("cached official guide name is branded without changing a third-party namesake", () => {
  const listing = { displayName: "ZCode Guide", displayNameI18n: { "zh-CN": "ZCode 使用指南" } };
  assert.equal(
    resolvePluginDisplayName(
      { id: "zcode-guide@zcode-plugins-official", name: "zcode-guide", listing },
      "zh-CN",
    ),
    "星思中转指导指南",
  );
  assert.equal(
    resolvePluginDisplayName(
      { id: "zcode-guide@third-party", name: "zcode-guide", listing },
      "zh-CN",
    ),
    "ZCode 使用指南",
  );
});

test("relay model switch labels omit the account email", () => {
  assert.equal(
    formatProviderModelLabel("new-provider", "星际中转站 · user@example.test", "glm-5.3"),
    "glm-5.3",
  );
  assert.equal(
    formatProviderModelLabel("new-provider", "星思天玑 · user@example.test", "kimi-k3"),
    "kimi-k3",
  );
  assert.equal(
    formatProviderModelLabel("other", "Other provider", "model"),
    "Other provider/model",
  );
});
