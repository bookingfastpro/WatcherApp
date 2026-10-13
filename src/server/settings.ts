import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { parseSettings, type PlatformSettings } from "@/lib/settings-schema";

const KEY = "platform";

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  const row = await db.appSetting.findUnique({ where: { key: KEY } });
  return parseSettings(row?.value);
});

export async function saveSettings(value: PlatformSettings, updatedById: string): Promise<void> {
  const json = value as unknown as Prisma.InputJsonValue;
  await db.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: json, updatedById },
    update: { value: json, updatedById },
  });
}
