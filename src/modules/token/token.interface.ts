import { Types } from 'mongoose';

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RESET_PASSWORD = 'resetPassword',
  VERIFY = 'verify',
}
export interface IToken {
  _id: string;
  user?: Types.ObjectId;
  token: string;
  verified: boolean;
  expiresAt: Date;
  type: TokenType;
}
