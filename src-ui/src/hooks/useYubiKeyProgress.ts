import { useState, useEffect } from 'react';
import { commands } from '../bindings';
import { logger } from '../lib/logger';

/**
 * Custom hook for polling YubiKey operation progress
 * Shows touch message when backend reaches WaitingForTouch phase
 *
 * Used by: NEW, REUSED without TDES, REUSED with TDES scenarios
 * Not used by: ORPHANED scenario (no touch required)
 */
export const useYubiKeyProgress = (operationId: string | null, isActive: boolean) => {
  const [showTouchMessage, setShowTouchMessage] = useState(false);

  useEffect(() => {
    if (!operationId || !isActive) {
      setShowTouchMessage(false);
      return;
    }

    logger.debug('useYubiKeyProgress', 'Starting progress polling', { operationId });

    const pollInterval = setInterval(async () => {
      try {
        const progressResult = await commands.getProgress({
          operation_id: operationId,
        });

        if (progressResult.status === 'ok') {
          const progress = progressResult.data;

          logger.debug('useYubiKeyProgress', 'Progress update', {
            operationId,
            phase: progress.details?.type === 'YubiKeyOperation' ? progress.details.phase : null,
            progress: progress.progress,
            message: progress.message,
          });

          // Check for WaitingForTouch phase
          if (
            progress.details?.type === 'YubiKeyOperation' &&
            progress.details.phase === 'WaitingForTouch'
          ) {
            logger.info('useYubiKeyProgress', 'Touch required - showing prompt', { operationId });
            setShowTouchMessage(true);
          }

          // Stop polling when complete
          if (progress.is_complete) {
            logger.info('useYubiKeyProgress', 'Operation complete - stopping polling', {
              operationId,
            });
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        logger.error('useYubiKeyProgress', 'Progress polling error', error as Error);
        clearInterval(pollInterval);
      }
    }, 250); // Poll every 250ms

    return () => {
      logger.debug('useYubiKeyProgress', 'Cleaning up polling', { operationId });
      clearInterval(pollInterval);
    };
  }, [operationId, isActive]);

  return { showTouchMessage };
};
