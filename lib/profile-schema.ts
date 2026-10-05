import { z } from "zod";

export const PROFILE_LIMITS = { name: 60, about: 2000, style: 500 } as const;

export const profileSchema = z.object({
	name: z.string().trim().max(PROFILE_LIMITS.name),
	about: z.string().trim().max(PROFILE_LIMITS.about),
	style: z.string().trim().max(PROFILE_LIMITS.style),
});

export type Profile = z.infer<typeof profileSchema>;
