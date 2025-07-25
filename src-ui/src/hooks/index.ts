// Business Logic Hooks for Barqly Vault
//
// These hooks encapsulate all the business logic for the application,
// providing clean interfaces for components to interact with the backend.
//
// All hooks use generated TypeScript types from the backend API
// and provide comprehensive error handling and progress tracking.

export { useKeyGeneration } from './useKeyGeneration';
export type {
  KeyGenerationState,
  KeyGenerationActions,
  UseKeyGenerationReturn,
} from './useKeyGeneration';

export { useFileEncryption } from './useFileEncryption';
export type {
  FileEncryptionState,
  FileEncryptionActions,
  UseFileEncryptionReturn,
} from './useFileEncryption';

export { useFileDecryption } from './useFileDecryption';
export type {
  FileDecryptionState,
  FileDecryptionActions,
  UseFileDecryptionReturn,
} from './useFileDecryption';

export { useProgressTracking, useAutoProgressTracking } from './useProgressTracking';
export type {
  ProgressTrackingState,
  ProgressTrackingActions,
  UseProgressTrackingReturn,
} from './useProgressTracking';
