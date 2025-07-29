import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PassphraseValidationFeedback, {
  ConfirmationMatch,
} from '../../../components/forms/PassphraseValidationFeedback';

describe('PassphraseValidationFeedback', () => {
  it('should show error message when error prop is provided', () => {
    render(<PassphraseValidationFeedback error="Passphrase is required" />);

    expect(screen.getByText('Passphrase is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should not show confirmation feedback for non-confirmation field', () => {
    const confirmationMatch: ConfirmationMatch = {
      matches: true,
      message: 'Passphrases match',
    };

    render(
      <PassphraseValidationFeedback
        isConfirmationField={false}
        confirmationMatch={confirmationMatch}
        value="test"
      />,
    );

    expect(screen.queryByText('Passphrases match')).not.toBeInTheDocument();
  });

  it('should show matching confirmation message for confirmation field', () => {
    const confirmationMatch: ConfirmationMatch = {
      matches: true,
      message: 'Passphrases match',
    };

    render(
      <PassphraseValidationFeedback
        isConfirmationField={true}
        confirmationMatch={confirmationMatch}
        value="test"
      />,
    );

    const matchMessage = screen.getByText('Passphrases match');
    expect(matchMessage).toBeInTheDocument();
    expect(matchMessage).toHaveClass('text-green-600');
  });

  it('should show non-matching confirmation message for confirmation field', () => {
    const confirmationMatch: ConfirmationMatch = {
      matches: false,
      message: "Passphrases don't match",
    };

    render(
      <PassphraseValidationFeedback
        isConfirmationField={true}
        confirmationMatch={confirmationMatch}
        value="test"
      />,
    );

    const matchMessage = screen.getByText("Passphrases don't match");
    expect(matchMessage).toBeInTheDocument();
    expect(matchMessage).toHaveClass('text-red-600');
  });

  it('should not show confirmation feedback when value is empty', () => {
    const confirmationMatch: ConfirmationMatch = {
      matches: false,
      message: "Passphrases don't match",
    };

    render(
      <PassphraseValidationFeedback
        isConfirmationField={true}
        confirmationMatch={confirmationMatch}
        value=""
      />,
    );

    expect(screen.queryByText("Passphrases don't match")).not.toBeInTheDocument();
  });

  it('should show both error and confirmation feedback when applicable', () => {
    const confirmationMatch: ConfirmationMatch = {
      matches: false,
      message: "Passphrases don't match",
    };

    render(
      <PassphraseValidationFeedback
        error="Passphrase is required"
        isConfirmationField={true}
        confirmationMatch={confirmationMatch}
        value="test"
      />,
    );

    expect(screen.getByText('Passphrase is required')).toBeInTheDocument();
    expect(screen.getByText("Passphrases don't match")).toBeInTheDocument();
  });
});
