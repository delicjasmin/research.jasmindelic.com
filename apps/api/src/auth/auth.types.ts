import type { Request } from "express";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
