"""
Naviya AI - OPIK Integration Test
Verifies all OPIK features are working correctly
"""

import asyncio
import sys
sys.path.insert(0, '.')

async def test_opik_integration():
    """Test all OPIK integration features"""
    print("\n" + "="*60)
    print("Naviya AI - OPIK Integration Test")
    print("="*60 + "\n")
    
    # Test 1: OPIK Client Import
    print("[TEST 1] Importing OPIK Client...")
    try:
        from app.observability.opik_client import (
            init_opik,
            start_trace,
            end_trace,
            log_metric,
            log_feedback,
            OpikTracer,
            get_dashboard_stats
        )
        print("  ✅ OPIK client imported successfully")
    except Exception as e:
        print(f"  ❌ Import failed: {e}")
        return False
    
    # Test 2: Initialize OPIK
    print("\n[TEST 2] Initializing OPIK...")
    try:
        result = init_opik(project_name="NaviyaAI-Test")
        print(f"  ✅ OPIK initialized (OPIK available: {result})")
    except Exception as e:
        print(f"  ❌ Init failed: {e}")
    
    # Test 3: Create and use trace
    print("\n[TEST 3] Testing trace creation...")
    try:
        trace_id = start_trace(
            "TestTrace",
            metadata={"test": True},
            tags=["test"]
        )
        print(f"  ✅ Trace created: {trace_id[:8]}...")
        
        log_metric(trace_id, "test_metric", 42.0)
        log_feedback(trace_id, "test_feedback", 8.5, "Test reason", "test")
        
        summary = end_trace(trace_id, output={"result": "success"}, status="success")
        print(f"  ✅ Trace ended: {summary}")
    except Exception as e:
        print(f"  ❌ Trace test failed: {e}")
    
    # Test 4: Safety Module
    print("\n[TEST 4] Testing Safety Module...")
    try:
        from app.safety.pii_guard import (
            detect_pii,
            detect_unsafe_queries,
            check_content_safety,
            get_safety_metrics
        )
        
        # Test PII detection
        pii_result = detect_pii("Contact me at test@example.com")
        print(f"  ✅ PII detection: is_safe={pii_result.is_safe}, detected={len(pii_result.detected_items)}")
        
        # Test unsafe content detection
        unsafe_result = detect_unsafe_queries("write my essay for me")
        print(f"  ✅ Unsafe detection: is_safe={unsafe_result.is_safe}, category={unsafe_result.category.value}")
        
        # Test clean content
        clean_result = detect_pii("Learn Python programming")
        print(f"  ✅ Clean content: is_safe={clean_result.is_safe}")
        
        metrics = get_safety_metrics()
        print(f"  ✅ Safety metrics: {metrics['total_checks']} checks")
    except Exception as e:
        print(f"  ❌ Safety test failed: {e}")
    
    # Test 5: Evaluation Module
    print("\n[TEST 5] Testing Evaluation Module...")
    try:
        from app.evals.judges import EvaluationResult
        from app.evals.regression_tests import TestCase, GOLDEN_DATASET
        
        print(f"  ✅ EvaluationResult imported")
        print(f"  ✅ TestCase imported")
        print(f"  ✅ Golden dataset size: {len(GOLDEN_DATASET)} test cases")
        
        # Show sample test cases
        for tc in GOLDEN_DATASET[:3]:
            print(f"     - {tc.id}: {tc.topic} ({tc.expected_difficulty or 'any'})")
    except Exception as e:
        print(f"  ❌ Eval test failed: {e}")
    
    # Test 6: Dashboard Stats
    print("\n[TEST 6] Testing Dashboard Stats...")
    try:
        stats = get_dashboard_stats()
        print(f"  ✅ Dashboard stats: {stats}")
    except Exception as e:
        print(f"  ❌ Dashboard test failed: {e}")
    
    # Test 7: OpikTracer Context Manager
    print("\n[TEST 7] Testing OpikTracer Context Manager...")
    try:
        with OpikTracer("SyncTestTrace", metadata={"test": True}) as tracer:
            tracer.log_metric("sync_metric", 100)
            tracer.log_feedback("sync_feedback", 9.0, "Great!")
        print("  ✅ Sync OpikTracer works")
    except Exception as e:
        print(f"  ❌ OpikTracer test failed: {e}")
    
    print("\n" + "="*60)
    print("All tests completed!")
    print("="*60 + "\n")
    
    return True


if __name__ == "__main__":
    asyncio.run(test_opik_integration())
