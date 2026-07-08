import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "default_access_secret_key_12345";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret_key_67890";
const ACCESS_TOKEN_EXPIRE = process.env.JWT_ACCESS_EXPIRE || "15m";
const REFRESH_TOKEN_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "7d";

export interface ITokenPayload {
  userId: string;
  role: "Guest" | "Host" | "Admin";
}

export const signAccessToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRE as jwt.SignOptions["expiresIn"],
  });
};

export const signRefreshToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRE as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as ITokenPayload;
};

export const verifyRefreshToken = (token: string): ITokenPayload => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as ITokenPayload;
};
