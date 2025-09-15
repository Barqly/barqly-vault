# Security Notice

## Factory Default Values

This code contains Yubico-published factory default values for YubiKey PIV:
- Default PIN: `123456`
- Default PUK: `12345678`  
- Default Management Key: `010203040506070801020304050607080102030405060708`

## Important Security Information

1. **These are NOT secrets** - They are publicly documented defaults from Yubico
2. **Source**: https://developers.yubico.com/PIV/Guides/Device_setup.html
3. **Purpose**: Used ONLY to transition from factory state to secure state
4. **Security Model**: 
   - Defaults are used ONLY when YubiKey confirms it's in factory state
   - Immediately replaced with secure values during initialization
   - New management key is randomly generated and PIN-protected

## Security Scan Compliance

If your security scanner flags these values:

1. **This is expected** - We're aware these look like hardcoded credentials
2. **They are safe** because:
   - They're public information, not secrets
   - Used only for one-way transition (default → secure)
   - Protected by state verification (only used if device confirms default state)
   - Immediately replaced with cryptographically secure values

## Audit Trail

- Every use of default values is logged
- State verification happens before any use
- Failed state verification prevents any operation

## Alternative Approaches Considered

1. **Requiring manual setup** - Poor UX, error-prone
2. **Environment variables** - Still contains same values, just hidden
3. **External config** - Adds complexity without security benefit
4. **This approach** - Transparent, auditable, secure transition

## Contact

For security concerns, please review:
- Full implementation in `src/ykman.rs`
- State verification logic
- Transition safeguards