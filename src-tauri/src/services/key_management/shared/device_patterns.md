# Device Implementation Patterns

This document defines the architectural patterns for implementing new key management devices (SmartCard, TPM, etc.) using the established YubiKey architecture as a reference.

## Architecture Pattern

Every device implementation should follow the Domain-Driven Design structure:

```
key_management/
└── {device_name}/           # e.g., smartcard, tpm, fido2
    ├── domain/              # Core business objects
    │   ├── models/          # Device-specific domain entities
    │   │   ├── mod.rs       # Re-exports
    │   │   ├── device.rs    # Device representation
    │   │   ├── identity.rs  # Identity/key representation
    │   │   ├── credential.rs # Authentication credentials
    │   │   └── state.rs     # Device states
    │   └── errors.rs        # Domain-specific errors
    ├── application/         # Business logic and orchestration
    │   ├── services/        # Business services
    │   │   ├── mod.rs
    │   │   ├── device_service.rs    # Device management
    │   │   ├── identity_service.rs  # Identity operations
    │   │   └── registry_service.rs  # Registry operations
    │   ├── manager.rs       # Main facade (DeviceManager)
    │   ├── factory.rs       # Object creation
    │   ├── events.rs        # Event system
    │   └── state.rs         # Application state
    └── infrastructure/      # External integrations
        ├── providers/       # Device provider abstractions
        ├── drivers/         # Hardware drivers or libraries
        └── protocols/       # Communication protocols
```

## Implementation Steps

### 1. Implement Shared Traits

Every device must implement the core shared traits:

```rust
use crate::key_management::shared::{
    HardwareSecurityDevice, IdentityManager, CryptoProvider, DeviceFactory
};

// Example for SmartCard
pub struct SmartCardDevice {
    device_id: DeviceId,
    // device-specific fields
}

#[async_trait]
impl HardwareSecurityDevice for SmartCardDevice {
    async fn get_device_info(&self) -> DeviceResult<DeviceInfo> {
        // Implementation
    }

    async fn is_connected(&self) -> DeviceResult<bool> {
        // Implementation
    }

    // ... other trait methods
}

#[async_trait]
impl IdentityManager for SmartCardDevice {
    // Implementation
}

#[async_trait]
impl CryptoProvider for SmartCardDevice {
    // Implementation
}
```

### 2. Create Domain Models

Define device-specific domain objects:

```rust
// domain/models/device.rs
#[derive(Debug, Clone)]
pub struct SmartCardDevice {
    pub serial: String,
    pub manufacturer: String,
    pub card_type: CardType,
    pub supported_algorithms: Vec<Algorithm>,
}

// domain/models/identity.rs
#[derive(Debug, Clone)]
pub struct SmartCardIdentity {
    pub key_id: String,
    pub certificate: Option<X509Certificate>,
    pub algorithm: Algorithm,
    pub slot: u8,
}

// domain/errors.rs
#[derive(Debug, thiserror::Error)]
pub enum SmartCardError {
    #[error("Card not present in reader")]
    CardNotPresent,

    #[error("PIN verification failed: {attempts} attempts remaining")]
    PinVerificationFailed { attempts: u8 },

    #[error("Unsupported algorithm: {algorithm}")]
    UnsupportedAlgorithm { algorithm: String },

    // ... other device-specific errors
}
```

### 3. Implement Application Services

Create business logic services following the established patterns:

```rust
// application/services/device_service.rs
pub struct SmartCardDeviceService {
    // service dependencies
}

impl SmartCardDeviceService {
    pub async fn list_connected_cards(&self) -> SmartCardResult<Vec<SmartCardDevice>> {
        // Implementation
    }

    pub async fn authenticate(&self, card_id: &str, pin: &str) -> SmartCardResult<()> {
        // Implementation
    }
}

// application/manager.rs
pub struct SmartCardManager {
    device_service: SmartCardDeviceService,
    identity_service: SmartCardIdentityService,
    // ... other services
}

impl SmartCardManager {
    pub async fn new() -> SmartCardResult<Self> {
        // Initialize all services
    }

    pub async fn initialize_card(&self, card_id: &str) -> SmartCardResult<SmartCardIdentity> {
        // Orchestrate multiple services
    }
}
```

### 4. Create Factory Implementation

```rust
// application/factory.rs
pub struct SmartCardFactory;

#[async_trait]
impl DeviceFactory for SmartCardFactory {
    fn device_type(&self) -> &str {
        "SmartCard"
    }

    async fn discover_devices(&self) -> DeviceResult<Vec<DeviceInfo>> {
        // Implementation
    }

    async fn create_device(&self, device_id: &DeviceId) -> DeviceResult<Box<dyn HardwareSecurityDevice>> {
        // Implementation
    }
}
```

### 5. Infrastructure Implementation

```rust
// infrastructure/drivers/pcsc_driver.rs
pub struct PcscDriver {
    // PC/SC context and connections
}

impl PcscDriver {
    pub fn connect_to_card(&self, reader: &str) -> Result<CardConnection> {
        // PC/SC implementation
    }
}

// infrastructure/providers/smartcard_provider.rs
pub struct SmartCardProvider {
    driver: PcscDriver,
}

impl SmartCardProvider {
    pub async fn send_apdu(&self, command: &[u8]) -> Result<Vec<u8>> {
        // Send APDU to card
    }
}
```

### 6. Module Integration

```rust
// mod.rs for the new device
pub mod domain;
pub mod application;
pub mod infrastructure;

// Re-export key types
pub use domain::{SmartCardError, SmartCardResult, SmartCardDevice, SmartCardIdentity};
pub use application::{SmartCardManager, SmartCardManagerConfig};
pub use infrastructure::SmartCardFactory;
```

## Key Design Principles

1. **Shared Trait Implementation**: All devices implement the same core traits for consistency
2. **Domain-Driven Design**: Clear separation of domain, application, and infrastructure concerns
3. **Facade Pattern**: Manager classes provide unified API
4. **Factory Pattern**: Consistent device creation across types
5. **Event-Driven**: Publish events for UI updates and monitoring
6. **Error Handling**: Device-specific errors that convert to common CommandError
7. **Testing**: Each layer should be testable in isolation

## Integration with Key Management

```rust
// In key_management/mod.rs
pub mod yubikey;
pub mod smartcard;  // New device
pub mod tpm;        // Future device
pub mod shared;

// Device registry usage
let registry = DeviceRegistry::new();
registry.register_factory(Box::new(YubiKeyFactory));
registry.register_factory(Box::new(SmartCardFactory));

// Discover all devices
let all_devices = registry.discover_all_devices().await?;
```

This pattern ensures consistency across all hardware security devices while allowing for device-specific optimizations and features.