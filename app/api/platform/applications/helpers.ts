import { getPlatformSession } from "@/lib/platform/auth";

export type PlatformSchoolAuth = {
  email: string | null;
  userId: string;
};

export async function requirePlatformSchool(): Promise<PlatformSchoolAuth | { error: string }> {
  const session = await getPlatformSession();

  if (!session.userId) {
    return { error: "Unauthorized" };
  }

  if (session.role !== "school") {
    return { error: "Forbidden" };
  }

  return {
    email: session.email,
    userId: session.userId,
  };
}

export function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function jsonAuthError(error: string) {
  return Response.json({ error }, { status: error === "Forbidden" ? 403 : 401 });
}
