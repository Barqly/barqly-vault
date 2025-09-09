import React, { useState, useEffect } from 'react';
import { Key, Fingerprint, Shield, Clock, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import {
  AvailableMethod,
  UnlockMethodType,
  ConfidenceLevel,
  invokeCommand,
} from '../../lib/api-types';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorMessage } from '../ui/error-message';

interface UnlockMethodChooserProps {
  filePath: string;
  selectedMethod?: UnlockMethodType;
  onMethodSelect: (method: UnlockMethodType) => void;
  onMethodsLoaded?: (methods: AvailableMethod[]) => void;
  isLoading?: boolean;
}

interface MethodOption extends AvailableMethod {
  icon: React.ElementType;
  colorClass: string;
  description: string;
}

/**
 * Component for selecting unlock method based on file analysis
 * Provides intelligent recommendations for the most appropriate unlock method
 */
const UnlockMethodChooser: React.FC<UnlockMethodChooserProps> = ({
  filePath,
  selectedMethod,
  onMethodSelect,
  onMethodsLoaded,
  isLoading = false,
}) => {
  const [availableMethods, setAvailableMethods] = useState<AvailableMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available unlock methods when file path changes
  useEffect(() => {
    if (filePath) {
      loadAvailableMethods();
    }
  }, [filePath]);

  const loadAvailableMethods = async () => {
    setIsLoadingMethods(true);
    setError(null);

    try {
      const methods = await invokeCommand<AvailableMethod[]>(
        'yubikey_get_available_unlock_methods',
        {
          file_path: filePath,
        },
      );

      setAvailableMethods(methods);

      if (onMethodsLoaded) {
        onMethodsLoaded(methods);
      }

      // Auto-select the first high-confidence method if none selected
      if (!selectedMethod && methods.length > 0) {
        const bestMethod =
          methods.find((m) => m.confidence_level === ConfidenceLevel.HIGH) || methods[0];
        onMethodSelect(bestMethod.method_type);
      }
    } catch (error: any) {
      setError(error.message);
      console.error('Failed to load unlock methods:', error);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const enhanceMethodWithDisplay = (method: AvailableMethod): MethodOption => {
    switch (method.method_type) {
      case UnlockMethodType.PASSPHRASE:
        return {
          ...method,
          icon: Key,
          colorClass: 'blue',
          description: method.description || 'Decrypt using your vault passphrase',
        };
      case UnlockMethodType.YUBIKEY:
        return {
          ...method,
          icon: Fingerprint,
          colorClass: 'green',
          description: method.description || 'Decrypt using your YubiKey hardware device',
        };
      case UnlockMethodType.HYBRID:
        return {
          ...method,
          icon: Shield,
          colorClass: 'purple',
          description: method.description || 'Decrypt using both passphrase and YubiKey',
        };
      default:
        return {
          ...method,
          icon: AlertCircle,
          colorClass: 'gray',
          description: method.description || 'Unknown unlock method',
        };
    }
  };

  const getConfidenceIcon = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case ConfidenceLevel.HIGH:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case ConfidenceLevel.MEDIUM:
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case ConfidenceLevel.LOW:
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getConfidenceText = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case ConfidenceLevel.HIGH:
        return 'Recommended';
      case ConfidenceLevel.MEDIUM:
        return 'Available';
      case ConfidenceLevel.LOW:
        return 'May work';
      default:
        return 'Unknown';
    }
  };

  const getColorClasses = (
    colorClass: string,
    isSelected: boolean,
    confidence: ConfidenceLevel,
  ) => {
    const base = isSelected
      ? `border-${colorClass}-500 bg-${colorClass}-50 shadow-md`
      : `border-gray-200 bg-white hover:border-${colorClass}-300 hover:shadow-sm`;

    const opacity = confidence === ConfidenceLevel.LOW ? 'opacity-75' : '';

    return `${base} ${opacity}`;
  };

  if (isLoadingMethods) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Analyzing Unlock Methods</h3>
        <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <LoadingSpinner size="md" className="mr-3" />
          <span className="text-gray-600">
            Detecting available unlock methods for your vault...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Unlock Method Selection</h3>
        <ErrorMessage
          error={{
            code: 'NO_UNLOCK_METHOD_AVAILABLE' as any,
            message: 'Failed to detect unlock methods',
            details: error,
            user_actionable: true,
            recovery_guidance: 'Check that the vault file is valid and try again',
          }}
          showRecoveryGuidance={true}
          onClose={() => setError(null)}
        />
        <button
          onClick={loadAvailableMethods}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Retry Detection
        </button>
      </div>
    );
  }

  if (availableMethods.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">No Unlock Methods Available</h3>
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            No compatible unlock methods found for this vault file.
          </p>
          <p className="text-sm text-gray-500">
            This file may have been created with a different protection method or may be corrupted.
          </p>
        </div>
      </div>
    );
  }

  const enhancedMethods = availableMethods.map(enhanceMethodWithDisplay);
  const recommendedMethod = enhancedMethods.find(
    (m) => m.confidence_level === ConfidenceLevel.HIGH,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Unlock Method</h3>
        <p className="text-sm text-gray-600">
          {recommendedMethod
            ? `We recommend using ${recommendedMethod.display_name} based on how this vault was created.`
            : 'Select the method you used when creating this vault.'}
        </p>
      </div>

      {/* Method Options */}
      <div className="grid grid-cols-1 gap-4">
        {enhancedMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.method_type;
          const isRecommended = method.confidence_level === ConfidenceLevel.HIGH;

          return (
            <div
              key={method.method_type}
              className={`
                relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200
                ${getColorClasses(method.colorClass, isSelected, method.confidence_level)}
                ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
              `}
              onClick={() => !isLoading && onMethodSelect(method.method_type)}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isLoading}
              tabIndex={isLoading ? -1 : 0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
                  e.preventDefault();
                  onMethodSelect(method.method_type);
                }
              }}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Recommended
                </div>
              )}

              <div className="flex items-start space-x-4">
                {/* Method Icon */}
                <div
                  className={`
                  p-3 rounded-lg flex-shrink-0
                  ${
                    isSelected
                      ? `bg-${method.colorClass}-100 text-${method.colorClass}-600`
                      : 'bg-gray-100 text-gray-600'
                  }
                `}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Method Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4
                      className={`font-medium ${isSelected ? `text-${method.colorClass}-900` : 'text-gray-900'}`}
                    >
                      {method.display_name}
                    </h4>

                    {/* Confidence indicator */}
                    <div className="flex items-center space-x-1">
                      {getConfidenceIcon(method.confidence_level)}
                      <span
                        className={`text-xs font-medium ${
                          method.confidence_level === ConfidenceLevel.HIGH
                            ? 'text-green-700'
                            : method.confidence_level === ConfidenceLevel.MEDIUM
                              ? 'text-yellow-700'
                              : 'text-red-700'
                        }`}
                      >
                        {getConfidenceText(method.confidence_level)}
                      </span>
                    </div>
                  </div>

                  <p
                    className={`text-sm ${isSelected ? `text-${method.colorClass}-700` : 'text-gray-600'} mb-3`}
                  >
                    {method.description}
                  </p>

                  {/* Method details */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Zap className="w-3 h-3 mr-1" />
                      <span>~{method.estimated_time}</span>
                    </div>
                    {method.requires_hardware && (
                      <div className="flex items-center">
                        <Fingerprint className="w-3 h-3 mr-1" />
                        <span>Hardware required</span>
                      </div>
                    )}
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="mt-3 flex items-center text-sm font-medium text-green-700">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Selected
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Method switching note */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Can't access your vault?</p>
            <p>
              You can try different unlock methods if your primary method isn't available. However,
              you'll only be able to decrypt if you have the correct credentials for the method used
              when creating the vault.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnlockMethodChooser;
