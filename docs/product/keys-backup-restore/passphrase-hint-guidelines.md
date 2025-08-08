# Passphrase Hint Security Guidelines

## Overview

Passphrase hints provide a crucial balance between security and usability, especially during high-stress recovery scenarios. This document outlines the implementation guidelines for the passphrase hint feature.

## Design Principles

1. **Optional by Default**: Hints are never required
2. **Security First**: Hints must not compromise passphrase security
3. **User Education**: Clear guidance on creating effective hints
4. **Stress Consideration**: Optimize for recovery under stress

## User Experience

### During Key Generation

```
Create Your Key Protection
─────────────────────────

Passphrase:       [************************]
                  Min 12 characters, include numbers & symbols

Confirm:          [************************]
                  
Hint (optional):  [________________________]
                  💡 This helps you remember, but others might see it
                  
                  ✓ Good: "Anniversary + dog's nickname"
                  ✗ Bad:  "password123" or "my birthday"
```

### During Recovery

```
Unlock Your Key
──────────────

💡 Hint: "Anniversary + dog's nickname"

Passphrase: [________________________]

[Unlock Key]
```

## Security Guidelines

### What Makes a Good Hint

#### GOOD Hints (Secure but Helpful)
- "Favorite book quote + year"
- "Mom's maiden name pattern"
- "First car + graduation"
- "Coffee order method"
- "Marathon time formula"

These work because they:
- Reference personal knowledge
- Don't reveal the actual passphrase
- Are meaningless to strangers
- Trigger memory without giving it away

#### BAD Hints (Too Revealing)
- "It's password123"
- "My birthday"
- "Same as email"
- "First 8 letters of name"
- Any part of the actual passphrase

### Validation Rules

1. **Length Limit**: Maximum 100 characters
2. **No Passphrase Content**: Hint cannot contain passphrase
3. **Pattern Detection**: Block common weak patterns
4. **Character Set**: Allow unicode for international users

### Implementation Checks

```javascript
// Frontend validation example
function validateHint(hint: string, passphrase: string): ValidationResult {
  const errors = [];
  
  // Length check
  if (hint.length > 100) {
    errors.push("Hint is too long (max 100 characters)");
  }
  
  // Contains passphrase check
  const hintLower = hint.toLowerCase();
  const passLower = passphrase.toLowerCase();
  
  if (hintLower.includes(passLower) || passLower.includes(hintLower)) {
    errors.push("Hint cannot contain your passphrase");
  }
  
  // Weak pattern detection
  const weakPatterns = [
    { pattern: /^password/i, message: "Hint is too obvious" },
    { pattern: /^\d{4,}$/, message: "Hint shouldn't be just numbers" },
    { pattern: /^same as/i, message: "Hint shouldn't reference other passwords" },
  ];
  
  weakPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(hint)) {
      errors.push(message);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Storage Considerations

### Metadata File Structure
```json
{
  "label": "family-vault",
  "created_at": "2025-08-08T15:52:09.347467Z",
  "file_path": "/path/to/key",
  "public_key": "age1aajp29j7rdpp709mk5ejjufnt49mk00zq4svgs74kct5qjj7fqjsyc83dr",
  "passphrase_hint": "Anniversary + dog's nickname",
  "last_accessed": null
}
```

### Security Notes
- Hint is stored in plaintext (needed before decryption)
- Visible in backups and exports
- Should be treated as semi-public information
- Never log or transmit over network

## User Education

### In-App Guidance

#### First-Time User
Show tooltip on first key generation:
```
💡 Pro Tip: A good hint reminds YOU but doesn't help others.
Think of inside jokes, personal references, or memory tricks
that only make sense to you.
```

#### Examples Gallery
Provide a "Show me examples" button that displays:
```
Examples of Good Hints:
• "The place we met + our song"
• "Childhood street backwards"
• "Dad's advice about money"
• "Recipe grandma taught me"
• "First concert equation"
```

### Warning Messages

#### When Hint Contains Passphrase
```
⚠️ Security Warning
Your hint contains your passphrase! This defeats the
purpose of having a passphrase. Please create a hint
that reminds you without revealing the answer.
```

#### When Hint is Too Simple
```
⚠️ Weak Hint Detected
Your hint appears too simple or common. Remember,
this hint might be visible to others who have access
to your computer. Make it personal and unique.
```

## Recovery Scenarios

### Scenario Analysis

#### Low Stress Recovery
User calmly setting up new device:
- Hint provides gentle reminder
- Multiple attempts allowed
- Can take time to remember

#### High Stress Recovery
Emergency file recovery needed:
- Hint becomes critical memory trigger
- Clear, large display of hint
- Calming UI design
- No timeout or lockout

### Hint Display Strategy

```typescript
interface HintDisplay {
  // Always show if available
  showHint: boolean;
  
  // Larger font in emergency mode
  fontSize: stress_level === 'high' ? '18px' : '14px';
  
  // Icon to draw attention
  icon: '💡';
  
  // Positioning for visibility
  position: 'above_input';
}
```

## Privacy Considerations

### What Users Should Know
1. Hints are stored unencrypted
2. Anyone with file access can see hints
3. Hints appear in backups
4. Hints are included in printed backup cards

### Disclosure Statement
```
ℹ️ Privacy Note: Your hint will be visible to anyone
who can access your backup files. Don't include
sensitive information that could be used against you.
```

## Testing Guidelines

### Test Cases
1. **Empty hint**: Should work (optional field)
2. **Hint equals passphrase**: Should reject
3. **Hint contains passphrase**: Should reject
4. **Unicode hints**: Should support (international users)
5. **Long hints**: Should truncate at 100 chars
6. **Special characters**: Should handle properly

### User Testing Scenarios
1. Create hint during calm setup
2. Use hint during stressed recovery
3. International users with non-English hints
4. Users who forget their hint's meaning
5. Users who change passphrases but not hints

## Metrics to Track

### Success Indicators
- **Hint Adoption Rate**: % of users who add hints
- **Recovery Success**: % successful recoveries with hints vs without
- **Support Tickets**: Reduction in password reset requests
- **Hint Quality**: % of hints that pass validation first try

### Warning Signs
- Users putting actual passphrases in hints
- High rate of "hint didn't help" feedback
- Security incidents from exposed hints

## Future Enhancements

### Potential Improvements
1. **Smart Hint Suggestions**: AI-powered hint ideas
2. **Hint Strength Meter**: Visual feedback on hint quality
3. **Multiple Hints**: Different hints for different contexts
4. **Time-Delayed Hints**: Show more revealing hints over time
5. **Biometric-Locked Hints**: Require fingerprint to view

### Not Recommended
- Mandatory hints (reduces security)
- Hints in QR codes (too much information)
- Network transmission of hints
- AI that learns from hints

## Conclusion

Passphrase hints are a valuable usability feature when implemented correctly. By following these guidelines, we can help users recover their keys during stressful situations without compromising security. The key is education and smart validation to ensure hints help the right person (the user) without helping the wrong people (attackers).