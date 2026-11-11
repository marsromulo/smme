export function schoolAccessAllowed(metadata: Record<string, unknown>, bannedUntil?: string) {
  return metadata.account_active !== false &&
    metadata.account_status === "approved" &&
    (!bannedUntil || Date.parse(bannedUntil) <= Date.now());
}

export function schoolBanDuration(active: boolean, approvalStatus: unknown) {
  return active && approvalStatus === "approved" ? "none" : "876000h";
}
