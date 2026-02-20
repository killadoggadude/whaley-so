import { getMaskedKeys } from "@/lib/api-keys";
import { ApiKeyCard } from "@/components/settings/api-key-card";
import { ThreadsConnectionCard } from "@/components/settings/threads-connection-card";
import { getThreadsAccountsAction } from "@/app/dashboard/settings/threads-actions";
import type { ApiService } from "@/types";

export const dynamic = "force-dynamic";

const SERVICES: ApiService[] = ["elevenlabs", "higgsfield", "wavespeed", "anthropic", "openai", "google"];

export default async function SettingsPage() {
  const maskedKeys = await getMaskedKeys();
  const { accounts: threadsAccounts } = await getThreadsAccountsAction();

  const keyMap = new Map(maskedKeys.map((k) => [k.service, k]));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Settings</h2>
        <p className="text-muted-foreground mb-6">
          Manage your API keys and connected accounts. Keys are encrypted before
          storage.
        </p>
      </div>

      {/* Connected Accounts */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Connected Accounts</h3>
        <ThreadsConnectionCard initialAccounts={threadsAccounts} />
      </div>

      {/* API Keys */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">API Keys</h3>
        {SERVICES.map((service) => (
          <ApiKeyCard
            key={service}
            service={service}
            existing={keyMap.get(service)}
          />
        ))}
      </div>
    </div>
  );
}
