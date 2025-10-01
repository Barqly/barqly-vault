//! Performance test for storage cache implementation
//!
//! This benchmark verifies that our caching implementation provides
//! the expected 10-20% performance improvement for repeated key listing operations.

// CLI utility examples are allowed to use println! for user interaction
#![allow(clippy::disallowed_macros)]

use barqly_vault_lib::services::key_management::shared::{list_keys, save_encrypted_key};
use barqly_vault_lib::services::shared::get_cache;
use std::time::{Duration, Instant};

const NUM_KEYS: usize = 10;
const NUM_ITERATIONS: usize = 100;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Cache Performance Test");
    println!("========================");

    // Setup: Create test keys
    setup_test_keys()?;

    // Test 1: Without cache (first run to ensure cache is empty)
    let cache = get_cache();
    cache.clear_all();

    let uncached_duration = benchmark_key_listing("Without Cache (Cold Start)");

    // Test 2: With cache (subsequent runs should hit cache)
    let cached_duration = benchmark_key_listing("With Cache (Warm Cache)");

    // Calculate performance improvement
    let improvement = calculate_improvement(uncached_duration, cached_duration);

    // Display results
    println!("\n📊 Performance Results");
    println!("=====================");
    println!(
        "Uncached average: {:.2}ms per operation",
        uncached_duration.as_millis() as f64 / NUM_ITERATIONS as f64
    );
    println!(
        "Cached average:   {:.2}ms per operation",
        cached_duration.as_millis() as f64 / NUM_ITERATIONS as f64
    );
    println!("Performance improvement: {improvement:.1}% faster");

    // Display cache metrics
    let metrics = cache.get_metrics();
    println!("\n📈 Cache Metrics");
    println!("===============");
    println!("Total requests: {}", metrics.total_requests);
    println!("Cache hit rate: {:.1}%", metrics.hit_rate() * 100.0);
    println!(
        "Key list hit rate: {:.1}%",
        metrics.key_list_hit_rate() * 100.0
    );
    println!("Cache invalidations: {}", metrics.cache_invalidations);

    // Verify performance target
    if improvement >= 10.0 {
        println!("\n✅ SUCCESS: Cache provides {improvement:.1}% improvement (target: 10-20%)");
    } else {
        println!("\n⚠️  WARNING: Cache improvement {improvement:.1}% is below 10% target");
    }

    // Cleanup
    cleanup_test_keys()?;

    Ok(())
}

fn setup_test_keys() -> Result<(), Box<dyn std::error::Error>> {
    println!("Setting up {NUM_KEYS} test keys...");

    for i in 0..NUM_KEYS {
        let label = format!("test_cache_key_{i}");
        let fake_encrypted_key = format!("encrypted_key_data_{i}").into_bytes();
        let fake_public_key = format!("age1test{i}publickey");

        // Only create if it doesn't exist
        if !barqly_vault_lib::services::key_management::shared::key_exists(&label)? {
            save_encrypted_key(&label, &fake_encrypted_key, Some(&fake_public_key))?;
        }
    }

    println!("✅ Test keys created");
    Ok(())
}

fn benchmark_key_listing(description: &str) -> Duration {
    println!("\n🔄 Running benchmark: {description}");

    let start = Instant::now();

    for i in 0..NUM_ITERATIONS {
        if i % 20 == 0 {
            print!(".");
        }

        // This is the operation we're benchmarking
        let _keys = list_keys().expect("Failed to list keys");
    }

    let duration = start.elapsed();
    println!(
        "\n   Duration: {:.2}ms total",
        duration.as_nanos() as f64 / 1_000_000.0
    );

    duration
}

fn calculate_improvement(uncached: Duration, cached: Duration) -> f64 {
    let uncached_ms = uncached.as_nanos() as f64;
    let cached_ms = cached.as_nanos() as f64;

    if cached_ms > 0.0 {
        ((uncached_ms - cached_ms) / uncached_ms) * 100.0
    } else {
        0.0
    }
}

fn cleanup_test_keys() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🧹 Cleaning up test keys...");

    for i in 0..NUM_KEYS {
        let label = format!("test_cache_key_{i}");
        if barqly_vault_lib::services::key_management::shared::key_exists(&label)? {
            barqly_vault_lib::services::key_management::shared::delete_key(&label)?;
        }
    }

    println!("✅ Cleanup complete");
    Ok(())
}
