import { model, Schema } from 'mongoose';
import { IToken, TokenType } from './token.interface';

const tokenSchema = new Schema<IToken>({
  token: {
    type: String,
    required: [true, 'Token is required'],
  },
  type: {
    type: String,
    enum: [
      TokenType.ACCESS,
      TokenType.REFRESH,
      TokenType.RESET_PASSWORD,
      TokenType.VERIFY,
    ],
    required: [true, 'Token type is required'],
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verified: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

export const Token  = model<IToken>('Token', tokenSchema);
