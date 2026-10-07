export type AuthUserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DRIVER"
  | "BROKER";

export interface AccessTokenPayload {
  userId: number;
  role: AuthUserRole;
}

export interface RefreshTokenPayload {
  userId: number;
  sessionId: string;
}