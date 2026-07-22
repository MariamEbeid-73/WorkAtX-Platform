import { UserProfile } from "@clerk/react";
import { clerkAppearance } from "../theme";

export function SettingsPage() {
  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <UserProfile appearance={clerkAppearance}>
        <UserProfile.Page label="account" />
        <UserProfile.Page label="billing" />
        <UserProfile.Page label="security" />
      </UserProfile>
    </div>
  );
}
