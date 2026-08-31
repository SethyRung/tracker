import { getRouterParam, type H3Event } from "h3";

function requireParam(event: H3Event, name: string, label: string): string {
  const value = getRouterParam(event, name);
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: `Missing ${label}` });
  }
  return value;
}

export function getRoomId(event: H3Event): string {
  return requireParam(event, "id", "room id");
}

export function getEntryId(event: H3Event): string {
  return requireParam(event, "eid", "entry id");
}

export function getCategoryId(event: H3Event): string {
  return requireParam(event, "cid", "category id");
}

export function getTemplateId(event: H3Event): string {
  return requireParam(event, "tid", "template id");
}

export function getMembershipId(event: H3Event): string {
  return requireParam(event, "mid", "member id");
}

export function getMonthKeyParam(event: H3Event): string {
  return requireParam(event, "yyyymm", "month key");
}
