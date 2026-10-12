export type AuthUserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DRIVER"
  | "BROKER";

export interface AccessTokenPayload {
  userId: number;
  role: AuthUserRole;
  sessionId: string;
}

export interface RefreshTokenPayload {
  userId: number;
  sessionId: string;
}