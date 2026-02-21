/**
 * Lightweight Result<T, E> type for explicit error propagation.
 *
 * A discriminated union that makes error handling visible in type signatures
 * instead of relying on try/catch. Used across the platform wherever operations
 * can fail with a structured error rather than an exception.
 */

/** Successful result containing a value */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failed result containing an error */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Discriminated union: either Ok<T> or Err<E> */
export type Result<T, E> = Ok<T> | Err<E>;

/** Create a successful Result */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/** Create a failed Result */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Type guard: narrows Result to Ok */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/** Type guard: narrows Result to Err */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

/** Extract the value from an Ok result, or throw if Err */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw new Error(`unwrap called on Err: ${String(result.error)}`);
};

/** Extract the value from an Ok result, or return the default if Err */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => (result.ok ? result.value : defaultValue);

/** Transform the value inside an Ok result, passing Err through unchanged */
export const mapResult = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result;
