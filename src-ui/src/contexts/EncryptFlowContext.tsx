import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { SelectedFiles } from '../types/file-types';

/**
 * Encrypt flow state management context
 * Manages state across all encryption steps with automatic persistence
 */

interface EncryptFlowState {
  // Core workflow state
  currentStep: number;
  selectedFiles: SelectedFiles | null;
  selectedKeyId: string;
  outputPath: string;
  archiveName: string;

  // UI state
  isNavigating: boolean;
  completedSteps: Set<number>;
  visitedSteps: Set<number>;

  // Validation state
  stepValidation: {
    step1: boolean; // Files selected
    step2: boolean; // Key selected
    step3: boolean; // Output configured (optional, always true)
  };
}

interface EncryptFlowContextValue extends EncryptFlowState {
  // State setters
  setSelectedFiles: (files: SelectedFiles | null) => void;
  setSelectedKeyId: (keyId: string) => void;
  setOutputPath: (path: string) => void;
  setArchiveName: (name: string) => void;

  // Navigation
  navigateToStep: (step: number) => void;
  canNavigateToStep: (step: number) => boolean;
  markStepCompleted: (step: number) => void;

  // Reset
  resetFlow: () => void;
  resetFromStep: (step: number) => void;
}

const initialState: EncryptFlowState = {
  currentStep: 1,
  selectedFiles: null,
  selectedKeyId: '',
  outputPath: '',
  archiveName: '',
  isNavigating: false,
  completedSteps: new Set<number>(),
  visitedSteps: new Set<number>([1]),
  stepValidation: {
    step1: false,
    step2: false,
    step3: true, // Output is optional
  },
};

const EncryptFlowContext = createContext<EncryptFlowContextValue | undefined>(undefined);

export const useEncryptFlow = () => {
  const context = useContext(EncryptFlowContext);
  if (!context) {
    throw new Error('useEncryptFlow must be used within EncryptFlowProvider');
  }
  return context;
};

interface EncryptFlowProviderProps {
  children: ReactNode;
}

export const EncryptFlowProvider: React.FC<EncryptFlowProviderProps> = ({ children }) => {
  const [state, setState] = useState<EncryptFlowState>(initialState);
  const [prevSelectedFiles, setPrevSelectedFiles] = useState<SelectedFiles | null>(null);

  // File selection handler
  const setSelectedFiles = useCallback((files: SelectedFiles | null) => {
    setState((prev) => ({
      ...prev,
      selectedFiles: files,
      stepValidation: {
        ...prev.stepValidation,
        step1: !!files,
      },
      completedSteps: files
        ? new Set([...prev.completedSteps, 1])
        : new Set([...prev.completedSteps].filter((s) => s !== 1)),
    }));
  }, []);

  // Key selection handler
  const setSelectedKeyId = useCallback((keyId: string) => {
    setState((prev) => ({
      ...prev,
      selectedKeyId: keyId,
      stepValidation: {
        ...prev.stepValidation,
        step2: !!keyId,
      },
      completedSteps: keyId
        ? new Set([...prev.completedSteps, 2])
        : new Set([...prev.completedSteps].filter((s) => s !== 2)),
    }));
  }, []);

  // Output path handler
  const setOutputPath = useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      outputPath: path,
    }));
  }, []);

  // Archive name handler
  const setArchiveName = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      archiveName: name,
    }));
  }, []);

  // Navigation logic
  const canNavigateToStep = useCallback(
    (targetStep: number) => {
      // Can always go back
      if (targetStep < state.currentStep) return true;

      // Forward navigation requires previous steps to be completed
      if (targetStep === 2) return state.stepValidation.step1;
      if (targetStep === 3) return state.stepValidation.step1 && state.stepValidation.step2;

      return false;
    },
    [state.currentStep, state.stepValidation],
  );

  const navigateToStep = useCallback(
    (step: number) => {
      if (!canNavigateToStep(step)) {
        console.warn(`Cannot navigate to step ${step} - prerequisites not met`);
        return;
      }

      setState((prev) => ({
        ...prev,
        currentStep: step,
        isNavigating: true,
        visitedSteps: new Set([...prev.visitedSteps, step]),
      }));

      // Reset navigation flag after animation
      setTimeout(() => {
        setState((prev) => ({ ...prev, isNavigating: false }));
      }, 300);
    },
    [canNavigateToStep],
  );

  const markStepCompleted = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, step]),
    }));
  }, []);

  // Auto-advance to step 2 only when files are initially selected (not when navigating back)
  useEffect(() => {
    if (state.selectedFiles && !prevSelectedFiles && state.currentStep === 1) {
      // Immediate transition to prevent flicker - no setTimeout needed
      setState((prev) => ({
        ...prev,
        currentStep: 2,
        visitedSteps: new Set([...prev.visitedSteps, 2]),
      }));
    }
    setPrevSelectedFiles(state.selectedFiles);
  }, [state.selectedFiles, prevSelectedFiles, state.currentStep]);

  // Reset entire flow
  const resetFlow = useCallback(() => {
    setState(initialState);
  }, []);

  // Reset from specific step
  const resetFromStep = useCallback((step: number) => {
    setState((prev) => {
      const newState = { ...prev };

      // Clear data from this step onwards
      if (step <= 1) {
        newState.selectedFiles = null;
        newState.selectedKeyId = '';
        newState.outputPath = '';
        newState.archiveName = '';
        newState.stepValidation.step1 = false;
        newState.stepValidation.step2 = false;
      } else if (step <= 2) {
        newState.selectedKeyId = '';
        newState.outputPath = '';
        newState.archiveName = '';
        newState.stepValidation.step2 = false;
      } else if (step <= 3) {
        newState.outputPath = '';
        newState.archiveName = '';
      }

      // Update completed steps
      newState.completedSteps = new Set([...prev.completedSteps].filter((s) => s < step));

      // Navigate to the reset step
      newState.currentStep = step;

      return newState;
    });
  }, []);

  const value: EncryptFlowContextValue = {
    ...state,
    setSelectedFiles,
    setSelectedKeyId,
    setOutputPath,
    setArchiveName,
    navigateToStep,
    canNavigateToStep,
    markStepCompleted,
    resetFlow,
    resetFromStep,
  };

  return <EncryptFlowContext.Provider value={value}>{children}</EncryptFlowContext.Provider>;
};
