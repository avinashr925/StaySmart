import jwt from "jsonwebtoken";
import { env } from "../config/env";

const ACCESS_TOKEN_SECRET = env.jwtAccessSecret;
const REFRESH_TOKEN_SECRET = env.jwtRefreshSecret;
const ACCESS_TOKEN_EXPIRE = env.jwtAccessExpire;
const REFRESH_TOKEN_EXPIRE = env.jwtRefreshExpire;

export interface ITokenPayload {
  userId: string;
  role: "Guest" | "Host" | "PropertyManager" | "Admin" | "SuperAdmin";
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
