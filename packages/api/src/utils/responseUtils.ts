import { Response } from "express";
import { ApiResponse } from "../types/cache.js";

/**
 * Utility functions for consistent API response formatting
 */

/**
 * Send a successful response with data
 * @param res Express response object
 * @param data Response data
 * @param statusCode HTTP status code (default: 200)
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param res Express response object
 * @param error Error message
 * @param statusCode HTTP status code (default: 500)
 * @param additionalData Additional data to include in response
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode = 500,
  additionalData?: Record<string, any>,
): void => {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };
  res.status(statusCode).json(response);
};

/**
 * Send a not found error response
 * @param res Express response object
 * @param resource Resource that was not found (e.g., "Key")
 * @param identifier Identifier that was not found
 */
export const sendNotFound = (
  res: Response,
  resource: string,
  identifier?: string,
): void => {
  const error = identifier
    ? `${resource} not found: ${identifier}`
    : `${resource} not found`;

  sendError(
    res,
    error,
    404,
    identifier ? { [resource.toLowerCase()]: identifier } : undefined,
  );
};

/**
 * Send a validation error response
 * @param res Express response object
 * @param validationErrors Array of validation error messages
 */
export const sendValidationError = (
  res: Response,
  validationErrors: string[],
): void => {
  sendError(res, "Validation failed", 400, {
    validationErrors,
  });
};

/**
 * Send a created response (HTTP 201)
 * @param res Express response object
 * @param data Response data
 */
export const sendCreated = <T>(res: Response, data: T): void => {
  sendSuccess(res, data, 201);
};
