[2025-08-04T19:44:14.453Z] [INFO] [DebugTauri] Starting Tauri environment diagnostics
[2025-08-04T19:44:14.453Z] [INFO] [DebugTauri] Window Tauri properties | Data: {
  "__TAURI__": true,
  "__TAURI_INTERNALS__": true,
  "__TAURI_IPC__": false,
  "__TAURI_CORE__": false,
  "isTauri": true,
  "tauriKeys": [
    "__TAURI_PLUGIN_DIALOG__",
    "__TAURI_IIFE__",
    "__TAURI_PLUGIN_OPENER__",
    "__TAURI__"
  ]
}
[2025-08-04T19:44:14.454Z] [INFO] [DebugTauri] __TAURI__ structure | Data: {
  "keys": [
    "app",
    "core",
    "dpi",
    "event",
    "image",
    "menu",
    "mocks",
    "path",
    "tray",
    "webview",
    "webviewWindow",
    "window"
  ],
  "core": true,
  "coreKeys": [
    "Channel",
    "PluginListener",
    "Resource",
    "SERIALIZE_TO_IPC_FN",
    "addPluginListener",
    "checkPermissions",
    "convertFileSrc",
    "invoke",
    "isTauri",
    "requestPermissions",
    "transformCallback"
  ],
  "invoke": "function"
}
[2025-08-04T19:44:14.454Z] [INFO] [DebugTauri] Direct invoke function found | Data: {
  "invokeType": "function",
  "invokeString": "async function p(e,n={},t){return window.__TAURI_INTERNALS__.invoke(e,n,t)}"
}
[2025-08-04T19:44:14.454Z] [INFO] [DebugTauri] Testing direct invoke with validate_passphrase command
[2025-08-04T19:44:14.462Z] [ERROR] [DebugTauri] Direct invoke test failed
[2025-08-04T19:44:14.462Z] [INFO] [DebugTauri] Testing dynamic import @tauri-apps/api/core
[2025-08-04T19:44:14.464Z] [INFO] [DebugTauri] Dynamic import successful | Data: {
  "keys": [
    "Channel",
    "PluginListener",
    "Resource",
    "SERIALIZE_TO_IPC_FN",
    "addPluginListener",
    "checkPermissions",
    "convertFileSrc",
    "invoke",
    "isTauri",
    "requestPermissions",
    "transformCallback"
  ],
  "invoke": "function"
}
[2025-08-04T19:44:14.464Z] [INFO] [DebugTauri] Testing imported invoke with validate_passphrase command
[2025-08-04T19:44:14.466Z] [ERROR] [DebugTauri] Imported invoke test failed
[2025-08-04T19:44:14.466Z] [INFO] [DebugTauri] __TAURI_INTERNALS__ found | Data: {
  "type": "object",
  "keys": [
    "plugins"
  ]
}
[2025-08-04T19:44:14.466Z] [INFO] [DebugTauri] Tauri environment diagnostics complete
[2025-08-04T19:44:31.911Z] [INFO] [TauriSafe] Attempting to invoke command: encrypt_files | Data: {
  "context": "useFileEncryption",
  "args": {
    "keyId": "test-key-1754336638759-3794377003",
    "filePaths": [
      "/Users/nauman/Downloads/hello-world.txt"
    ],
    "outputPath": "/Users/nauman/Documents/Barqly-Vaults"
  },
  "isTauriEnvironment": true
}
[2025-08-04T19:44:31.913Z] [ERROR] [TauriSafe] Command failed: encrypt_files | Data: {
  "context": "useFileEncryption",
  "cmd": "encrypt_files",
  "args": {
    "keyId": "test-key-1754336638759-3794377003",
    "filePaths": [
      "/Users/nauman/Downloads/hello-world.txt"
    ],
    "outputPath": "/Users/nauman/Documents/Barqly-Vaults"
  },
  "duration": "2.00ms",
  "errorType": "String",
  "errorDetails": "invalid args `input` for command `encrypt_files`: missing field `key_id`"
}