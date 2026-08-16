import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().min(1).max(80),
  usdEnabled: z.boolean().default(true),
  khrEnabled: z.boolean().default(true),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  usdEnabled: z.boolean().optional(),
  khrEnabled: z.boolean().optional(),
});

export const updateMemberSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  nickname: z.string().max(80).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  sharePercentBps: z.number().int().min(0).max(10000).optional(),
});

export const joinRoomSchema = z.object({
  token: z.string().min(1).max(64),
  displayName: z.string().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const createInviteSchema = z.object({
  emails: z.array(z.email().max(254)).min(1).max(20),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
