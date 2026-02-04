declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
      sessionId?: string;
    }
  }
}

export {};
