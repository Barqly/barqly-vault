# Backup Card Design Specification

## Overview

The backup card is a printable physical backup method for Barqly Vault encryption keys, inspired by paper wallet designs from cryptocurrency applications and emergency access cards from password managers like 1Password.

## Design Principles

1. **Print-Friendly**: Black and white compatible, works on any printer
2. **Durable**: Clear layout that photographs well if laminated
3. **Self-Contained**: All information needed for recovery on one card
4. **Professional**: Inspires confidence in security-conscious users
5. **Scannable**: QR code optimized for phone cameras and webcams

## Card Dimensions

- **Standard Size**: US Letter (8.5" x 11") with cut lines for wallet size
- **Wallet Size**: 3.5" x 2.25" (standard business card)
- **Recommended**: Print on cardstock (110lb or heavier)

## Visual Design

### Layout Structure

```
┌─────────────────────────────────────────────┐
│                                             │
│            [BARQLY VAULT LOGO]              │
│         ENCRYPTION KEY BACKUP               │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Key Name:  [family-vault]                 │
│  Created:   [2025-08-08 10:45 AM]         │
│  Key ID:    [Last 8 chars of public key]   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│          ┌─────────────────┐               │
│          │                 │               │
│          │                 │               │
│          │    QR CODE      │               │
│          │   (Encrypted    │               │
│          │     Key)        │               │
│          │                 │               │
│          │                 │               │
│          └─────────────────┘               │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Manual Entry Code:                        │
│  ┌─────────────────────────────────────┐   │
│  │ AGE-SECRET-KEY-1QYQSZQGPQYQSZQGP    │   │
│  │ QYQSZQGPQYQSZQGPQYQSZQGPQYQSZQGP    │   │
│  │ QYQSZQGPQYQSZQGPQYQSZQGPQYQSZQGP    │   │
│  │ QYQSZQGPQYQSZQGPQYQSZQGPQYQS        │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠️  CRITICAL SECURITY INFORMATION         │
│                                             │
│  • Store this card in a secure location    │
│  • You need BOTH this key AND your         │
│    passphrase to decrypt files             │
│  • Never photograph or scan unless         │
│    storing securely                        │
│  • This key can decrypt ALL your vaults    │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Recovery Instructions:                    │
│  1. Install Barqly Vault                   │
│  2. Select "Restore from Backup"           │
│  3. Scan QR code or enter manual code      │
│  4. Enter your passphrase                  │
│                                             │
│  Support: support@barqly.com               │
│  Docs: barqly.com/recover                  │
│                                             │
└─────────────────────────────────────────────┘
```

## Typography

### Fonts

- **Headers**: System UI Bold, 14pt
- **Labels**: System UI Semibold, 10pt
- **Body Text**: System UI Regular, 9pt
- **Manual Code**: Monospace (Courier New), 10pt
- **Warnings**: System UI Bold, 10pt (red if color printing)

### Text Hierarchy

1. Product name (largest)
2. Section headers
3. Key metadata
4. Instructions
5. Fine print

## QR Code Specifications

### Technical Requirements

- **Error Correction**: Level H (30% damage tolerance)
- **Module Size**: Minimum 4x4 pixels per module
- **Quiet Zone**: 4 modules on all sides
- **Data Capacity**: ~2,950 bytes with Level H

### Multi-Part QR Codes

If key exceeds single QR capacity:

```
┌────────┐ ┌────────┐ ┌────────┐
│ QR 1/3 │ │ QR 2/3 │ │ QR 3/3 │
└────────┘ └────────┘ └────────┘
Part 1 of 3  Part 2 of 3  Part 3 of 3
```

### QR Code Data Structure

```json
{
  "v": "1.0",
  "type": "age-backup",
  "name": "family-vault",
  "created": "2025-08-08T10:45:00Z",
  "part": 1,
  "total": 1,
  "data": "AGE-SECRET-KEY-1...",
  "checksum": "sha256:abc123..."
}
```

## Color Schemes

### Standard (Black & White)

- Background: White (#FFFFFF)
- Text: Black (#000000)
- QR Code: Black on white
- Borders: Black 1pt

### Professional (Subtle Color)

- Background: White (#FFFFFF)
- Headers: Dark Blue (#1E3A8A)
- Warnings: Red (#DC2626)
- Borders: Gray (#D1D5DB)

## Security Features

### Visual Security Elements

1. **Holographic Sticker Space**: Designated area for tamper-evident seal
2. **Serial Number**: Unique identifier for tracking
3. **Void Pattern**: Optional background pattern that shows "VOID" when copied
4. **Microprint Border**: Fine text border readable only with magnification

### Information Security

- No sensitive metadata (file paths, system info)
- Only encrypted key included
- Passphrase never printed
- No network endpoints except support

## Folding Variants

### Bi-Fold Card (Privacy)

```
Outside:                    Inside:
┌─────────────┐            ┌─────────────┐
│   BARQLY    │            │   QR CODE   │
│   VAULT     │            │   MANUAL    │
│   BACKUP    │            │   CODE      │
└─────────────┘            └─────────────┘
```

### Envelope Style

- Card fits in standard #10 envelope
- Includes separate instruction sheet
- QR code hidden when folded

## Print Templates

### HTML Template Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      @media print {
        @page {
          size: letter;
          margin: 0.5in;
        }
        body {
          font-family: -apple-system, system-ui, sans-serif;
        }
        .no-print {
          display: none;
        }
        .page-break {
          page-break-after: always;
        }
      }

      .backup-card {
        border: 2pt solid #000;
        padding: 20px;
        max-width: 7.5in;
      }

      .qr-code {
        width: 200px;
        height: 200px;
        margin: 20px auto;
      }

      .manual-code {
        font-family: "Courier New", monospace;
        font-size: 10pt;
        word-break: break-all;
        background: #f5f5f5;
        padding: 10px;
        border: 1pt solid #ccc;
      }

      .warning {
        color: #dc2626;
        font-weight: bold;
        border: 2pt solid #dc2626;
        padding: 10px;
        margin: 15px 0;
      }
    </style>
  </head>
  <body>
    <div class="backup-card">
      <!-- Card content here -->
    </div>
  </body>
</html>
```

### PDF Generation

- Use @react-pdf/renderer for React
- Include embedded fonts for consistency
- Vector QR code for quality
- Flatten to prevent editing

## Accessibility

### Large Print Version

- 16pt minimum font size
- High contrast borders
- Enlarged QR code
- Simplified layout

### Screen Reader Version

- Semantic HTML structure
- ARIA labels for QR code
- Alt text for images
- Keyboard navigation for digital version

## Testing Requirements

### Print Testing

- Test on inkjet and laser printers
- Verify QR scanning at different sizes
- Check readability after folding
- Test lamination compatibility

### Scan Testing

- Phone cameras (iOS/Android)
- Webcams (various resolutions)
- QR scanner apps
- Different lighting conditions

## Production Considerations

### Pre-Printed Stock

- Optional: Pre-print card templates
- Users only add QR and manual code
- Reduces printer requirements
- Professional appearance

### Digital Wallet Integration

- Apple Wallet pass format
- Google Wallet support
- PDF with password protection
- Encrypted digital backup

## Localization

### Supported Languages

- English (primary)
- Spanish
- French
- German
- Japanese
- Simplified Chinese

### Layout Adjustments

- RTL language support (Arabic, Hebrew)
- Character encoding for Asian languages
- Dynamic text sizing for longer translations

## Version History

- v1.0: Initial design with single QR code
- v1.1: Added multi-part QR support
- v1.2: Enhanced security features
- v2.0: Wallet-size variant added

## References

- 1Password Emergency Kit design
- Bitcoin paper wallet standards
- ISO/IEC 18004:2015 (QR Code standard)
- WCAG 2.1 AA accessibility guidelines
