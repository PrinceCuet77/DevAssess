import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../errors/ApiError';

type ValidateSource = 'body' | 'query' | 'params' | 'cookies';

export const validate = (
  schema: ZodSchema,
  source: ValidateSource = 'body',
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errorMessage = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new BadRequestError(errorMessage);
    }

    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      Object.assign(req.query, result.data);
    } else if (source === 'params') {
      Object.assign(req.params, result.data);
    } else if (source === 'cookies') {
      (req as any).validatedCookies = result.data;
    }

    next();
  };
};
