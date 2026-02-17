"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AtSign,
  RefreshCw,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  refreshTokenAction,
  disconnectThreadsAction,
  toggleThreadsActiveAction,
} from "@/app/dashboard/settings/threads-actions";
import type { ThreadsAccountWithStatus, TokenStatus } from "@/types";

interface ThreadsConnectionCardProps {
  initialAccounts: ThreadsAccountWithStatus[];
}

function TokenStatusBadge({ status }: { status: TokenStatus }) {
  switch (status) {
    case "valid":
      return (
        <Badge
          variant="secondary"
          className="gap-1 bg-green-100 text-green-800"
        >
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      );
    case "expiring_soon":
      return (
        <Badge
          variant="secondary"
          className="gap-1 bg-yellow-100 text-yellow-800"
        >
          <Clock className="h-3 w-3" />
          Expiring Soon
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
  }
}

export function ThreadsConnectionCard({
  initialAccounts,
}: ThreadsConnectionCardProps) {
  const [accounts, setAccounts] =
    useState<ThreadsAccountWithStatus[]>(initialAccounts);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Show success toast if redirected from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threadsStatus = params.get("threads");

    if (threadsStatus === "connected") {
      toast.success("Threads account connected successfully!");
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("threads");
      window.history.replaceState({}, "", url.toString());
      // Reload to get fresh data
      window.location.reload();
    } else if (threadsStatus === "error") {
      const message = params.get("message") || "Connection failed";
      toast.error(`Failed to connect Threads: ${message}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("threads");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleRefresh = async (accountId: string) => {
    setRefreshingId(accountId);
    const result = await refreshTokenAction(accountId);
    setRefreshingId(null);

    if (result.success) {
      toast.success("Token refreshed successfully!");
      // Update local state
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountId ? { ...a, token_status: "valid" } : a
        )
      );
    } else {
      toast.error(result.error || "Failed to refresh token");
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setDisconnectingId(accountId);
    const result = await disconnectThreadsAction(accountId);
    setDisconnectingId(null);

    if (result.success) {
      toast.success("Threads account disconnected");
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } else {
      toast.error(result.error || "Failed to disconnect");
    }
  };

  const handleToggleActive = async (
    accountId: string,
    currentActive: boolean
  ) => {
    setTogglingId(accountId);
    const result = await toggleThreadsActiveAction(accountId, !currentActive);
    setTogglingId(null);

    if (result.success) {
      toast.success(
        `Account ${!currentActive ? "activated" : "deactivated"}`
      );
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountId ? { ...a, is_active: !currentActive } : a
        )
      );
    } else {
      toast.error(result.error || "Failed to update account");
    }
  };

  const handleConnect = () => {
    // Navigate to the authorize endpoint which will redirect to Threads OAuth
    window.location.href = "/api/threads/authorize";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <AtSign className="h-5 w-5" />
          <CardTitle className="text-lg">Threads</CardTitle>
        </div>
        <Button size="sm" onClick={handleConnect}>
          <ExternalLink className="h-4 w-4 mr-1.5" />
          {accounts.length > 0
            ? "Connect Another Account"
            : "Connect Threads Account"}
        </Button>
      </CardHeader>

      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Threads accounts connected. Connect an account to start
            scheduling and publishing posts.
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg bg-card border border-border p-4 transition-colors duration-200 hover:bg-card-hover"
              >
                <div className="flex items-center gap-3">
                  {account.profile_pic_url ? (
                    <img
                      src={account.profile_pic_url}
                      alt={account.username}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <AtSign className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      @{account.username}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TokenStatusBadge status={account.token_status} />
                      {!account.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Toggle active */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleToggleActive(account.id, account.is_active)
                    }
                    disabled={togglingId === account.id}
                    title={
                      account.is_active
                        ? "Deactivate account"
                        : "Activate account"
                    }
                  >
                    {togglingId === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : account.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  {/* Refresh token */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRefresh(account.id)}
                    disabled={
                      refreshingId === account.id ||
                      account.token_status === "expired"
                    }
                    title={
                      account.token_status === "expired"
                        ? "Token expired — reconnect account"
                        : "Refresh token"
                    }
                  >
                    {refreshingId === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Disconnect */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={disconnectingId === account.id}
                      >
                        {disconnectingId === account.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Disconnect @{account.username}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the Threads account connection.
                          Scheduled posts for this account will not be published.
                          You can reconnect the account at any time.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisconnect(account.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {accounts.some((a) => a.token_status === "expired") && (
          <p className="text-xs text-destructive mt-3">
            One or more accounts have expired tokens. Please reconnect them to
            continue publishing.
          </p>
        )}

        {accounts.some((a) => a.token_status === "expiring_soon") && (
          <p className="text-xs text-yellow-600 mt-3">
            One or more account tokens are expiring soon. Click the refresh
            button to extend them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
