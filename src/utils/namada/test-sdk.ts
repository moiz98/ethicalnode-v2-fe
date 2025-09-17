/**
 * Test script for diagnosing Namada SDK initialization issues
 */

export async function testNamadaSDK() {
  console.log('🔍 Starting Namada SDK diagnostic test...');
  
  try {
    // Test 1: Check environment
    console.log('✅ Test 1: Environment check');
    console.log('  - Browser environment:', typeof window !== 'undefined');
    console.log('  - Buffer available:', typeof window.Buffer !== 'undefined');
    console.log('  - Global available:', typeof globalThis !== 'undefined');
    
    // Test 2: Try importing SDK
    console.log('✅ Test 2: SDK import test');
    try {
      const sdkModule = await import('@namada/sdk/inline');
      console.log('  - SDK modules loaded:', Object.keys(sdkModule));
      console.log('  - initSdk available:', typeof sdkModule.initSdk === 'function');
      console.log('  - getNativeToken available:', typeof sdkModule.getNativeToken === 'function');
    } catch (importError) {
      console.error('  - SDK import failed:', importError);
      throw importError;
    }
    
    // Test 3: Try creating SDK instance (without RPC)
    console.log('✅ Test 3: SDK instantiation test (dry run)');
    try {
      await import('@namada/sdk/inline');
      console.log('  - SDK module imported successfully');
      
      // Don't actually initialize to avoid network calls
      console.log('  - Skipping actual initialization to avoid network calls');
    } catch (sdkError) {
      console.error('  - SDK instantiation preparation failed:', sdkError);
      throw sdkError;
    }
    
    console.log('🎉 All diagnostic tests passed! The issue might be network-related.');
    return true;
    
  } catch (error: any) {
    console.error('❌ Diagnostic test failed:', error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.split('\n')?.slice(0, 5)
    });
    return false;
  }
}

// Auto-run test in development
if (process.env.NODE_ENV === 'development') {
  // Run test after a short delay to ensure environment is ready
  setTimeout(() => {
    testNamadaSDK();
  }, 1000);
}
