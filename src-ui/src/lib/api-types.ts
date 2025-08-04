/**
 * TypeScript type definitions for Barqly Vault Tauri Commands
 *
 * This file contains TYPE DEFINITIONS that mirror Rust structures.
 * For RUNTIME INVOCATION wrappers, see tauri-safe.ts
 *
 * Note: While the header suggests auto-generation, this file is currently
 * manually maintained for better TypeScript integration. The generate-types
 * feature exists but is not actively used.
 *
 * Contents:
 * - Data structure interfaces (CommandError, input/output types)
 * - Enums (ErrorCode, EncryptionStatus)
 * - Type aliases (CommandResult, ProgressDetails)
 * - Utility functions (invokeCommand)
 * - Error class (CommandErrorClass)
 */

// Core command response types
export type CommandResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; data: CommandError };

export type CommandResponse<T> = T | CommandError;

// Error handling types
export interface CommandError {
  code: ErrorCode;
  message: string;
  details?: string;
  recovery_guidance?: string;
  user_actionable: boolean;
  trace_id?: string;
  span_id?: string;
}

export enum ErrorCode {
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_PATH = 'INVALID_PATH',
  INVALID_KEY_LABEL = 'INVALID_KEY_LABEL',
  WEAK_PASSPHRASE = 'WEAK_PASSPHRASE',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TOO_MANY_FILES = 'TOO_MANY_FILES',

  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PATH_NOT_ALLOWED = 'PATH_NOT_ALLOWED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  READ_ONLY_FILE_SYSTEM = 'READ_ONLY_FILE_SYSTEM',

  // Not found errors
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  OPERATION_NOT_FOUND = 'OPERATION_NOT_FOUND',

  // Operation errors
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',
  STORAGE_FAILED = 'STORAGE_FAILED',
  ARCHIVE_CORRUPTED = 'ARCHIVE_CORRUPTED',
  MANIFEST_INVALID = 'MANIFEST_INVALID',
  INTEGRITY_CHECK_FAILED = 'INTEGRITY_CHECK_FAILED',
  CONCURRENT_OPERATION = 'CONCURRENT_OPERATION',

  // Resource errors
  DISK_SPACE_INSUFFICIENT = 'DISK_SPACE_INSUFFICIENT',
  MEMORY_INSUFFICIENT = 'MEMORY_INSUFFICIENT',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Security errors
  INVALID_KEY = 'INVALID_KEY',
  WRONG_PASSPHRASE = 'WRONG_PASSPHRASE',
  TAMPERED_DATA = 'TAMPERED_DATA',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',

  // Internal errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

// Progress tracking types
export interface ProgressUpdate {
  operation_id: string;
  progress: number; // 0.0 to 1.0
  message: string;
  details?: ProgressDetails;
  timestamp: string; // ISO 8601
  estimated_time_remaining?: number; // seconds
}

export type ProgressDetails =
  | {
      type: 'FileOperation';
      current_file: string;
      total_files: number;
      current_file_progress: number;
      current_file_size: number;
      total_size: number;
    }
  | { type: 'Encryption'; bytes_processed: number; total_bytes: number; encryption_rate?: number }
  | { type: 'Decryption'; bytes_processed: number; total_bytes: number; decryption_rate?: number }
  | {
      type: 'ArchiveOperation';
      files_processed: number;
      total_files: number;
      bytes_processed: number;
      total_bytes: number;
      compression_ratio?: number;
    }
  | {
      type: 'ManifestOperation';
      files_verified: number;
      total_files: number;
      current_file: string;
    };

// Crypto command types
export interface GenerateKeyInput {
  label: string;
  passphrase: string;
}

export interface GenerateKeyResponse {
  public_key: string;
  key_id: string;
  saved_path: string;
}

export interface ValidatePassphraseInput {
  passphrase: string;
}

export interface ValidatePassphraseResponse {
  is_valid: boolean;
  message: string;
}

export interface EncryptDataInput {
  keyId: string;
  filePaths: string[];
  outputName?: string;
}

export interface DecryptDataInput {
  encryptedFile: string;
  keyId: string;
  passphrase: string;
  output_dir: string;
}

export interface DecryptionResult {
  extracted_files: string[];
  output_dir: string;
  manifest_verified: boolean;
}

export interface GetEncryptionStatusInput {
  operation_id: string;
}

export interface EncryptionStatusResponse {
  operation_id: string;
  status: EncryptionStatus;
  progress_percentage: number;
  current_file?: string;
  total_files: number;
  processed_files: number;
  total_size: number;
  processed_size: number;
  estimated_time_remaining?: number;
  error_message?: string;
}

export enum EncryptionStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled',
}

export interface GetProgressInput {
  operation_id: string;
}

export interface GetProgressResponse {
  operation_id: string;
  progress: number;
  message: string;
  details?: ProgressDetails;
  timestamp: string;
  estimated_time_remaining?: number;
  is_complete: boolean;
}

export interface VerifyManifestInput {
  manifest_path: string;
  extracted_files_dir: string;
}

export interface VerifyManifestResponse {
  is_valid: boolean;
  message: string;
  file_count: number;
  total_size: number;
}

// Storage command types
export interface KeyMetadata {
  label: string;
  created_at: string;
  public_key?: string;
}

export interface AppConfig {
  version: string;
  default_key_label?: string;
  remember_last_folder: boolean;
  max_recent_files: number;
}

export interface AppConfigUpdate {
  default_key_label?: string;
  remember_last_folder?: boolean;
  max_recent_files?: number;
}

// File command types
export enum SelectionType {
  FILES = 'Files',
  FOLDER = 'Folder',
}

export interface FileSelection {
  paths: string[];
  total_size: number;
  file_count: number;
  selection_type: string;
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  is_file: boolean;
  is_directory: boolean;
}

export interface Manifest {
  version: string;
  created_at: string;
  files: FileInfo[];
  total_size: number;
  file_count: number;
}

// Command invocation helper
export async function invokeCommand<T>(cmd: string, args?: any): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke<CommandResult<T>>(cmd, args);

  if (result.status === 'error') {
    throw new CommandErrorClass(result.data);
  }

  return result.data;
}

// Custom error class for better error handling
export class CommandErrorClass extends Error {
  public code: ErrorCode;
  public details?: string;
  public recovery_guidance?: string;
  public user_actionable: boolean;
  public trace_id?: string;
  public span_id?: string;

  constructor(error: CommandError) {
    super(error.message);
    this.name = 'CommandError';
    this.code = error.code;
    this.details = error.details;
    this.recovery_guidance = error.recovery_guidance;
    this.user_actionable = error.user_actionable;
    this.trace_id = error.trace_id;
    this.span_id = error.span_id;
  }

  isValidationError(): boolean {
    return [
      ErrorCode.INVALID_INPUT,
      ErrorCode.MISSING_PARAMETER,
      ErrorCode.INVALID_PATH,
      ErrorCode.INVALID_KEY_LABEL,
      ErrorCode.WEAK_PASSPHRASE,
      ErrorCode.INVALID_FILE_FORMAT,
      ErrorCode.FILE_TOO_LARGE,
      ErrorCode.TOO_MANY_FILES,
    ].includes(this.code);
  }

  isPermissionError(): boolean {
    return [
      ErrorCode.PERMISSION_DENIED,
      ErrorCode.PATH_NOT_ALLOWED,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      ErrorCode.READ_ONLY_FILE_SYSTEM,
    ].includes(this.code);
  }

  isNotFoundError(): boolean {
    return [
      ErrorCode.KEY_NOT_FOUND,
      ErrorCode.FILE_NOT_FOUND,
      ErrorCode.DIRECTORY_NOT_FOUND,
      ErrorCode.OPERATION_NOT_FOUND,
    ].includes(this.code);
  }

  isSecurityError(): boolean {
    return [
      ErrorCode.INVALID_KEY,
      ErrorCode.WRONG_PASSPHRASE,
      ErrorCode.TAMPERED_DATA,
      ErrorCode.UNAUTHORIZED_ACCESS,
    ].includes(this.code);
  }

  isRecoverable(): boolean {
    return this.user_actionable && !this.isSecurityError();
  }
}
