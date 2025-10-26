#!/usr/bin/env python3
"""
Automated Testing & Validation for Visual Occupancy Detection
Tests the visual_occupancy.py script and validates results
"""

import json
import subprocess
import sys
from pathlib import Path


def run_visual_analysis(image_path, debug=False):
    """Run visual occupancy analysis on an image"""
    cmd = [
        sys.executable,
        str(Path(__file__).parent / "visual_occupancy.py"),
        "--image", str(image_path),
    ]
    if debug:
        cmd.append("--debug")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            return None, result.stderr
        
        return json.loads(result.stdout), None
    except Exception as e:
        return None, str(e)


def validate_result(result, image_name):
    """Validate that result makes sense"""
    issues = []
    warnings = []
    
    if not isinstance(result, dict):
        return False, ["Result is not a dict"]
    
    # Check required fields
    required_fields = ["fill_percent", "final_score", "category", "snack_percent"]
    for field in required_fields:
        if field not in result:
            issues.append(f"Missing field: {field}")
    
    if issues:
        return False, issues
    
    final_score = result.get("final_score", 0)
    fill_percent = result.get("fill_percent", 0)
    snack_percent = result.get("snack_percent", 0)
    category = result.get("category", "unknown")
    
    # Validate score ranges
    if not (0 <= final_score <= 10):
        issues.append(f"final_score out of range: {final_score}")
    
    if not (0 <= fill_percent <= 100):
        issues.append(f"fill_percent out of range: {fill_percent}")
    
    # Validate category
    valid_categories = ["empty", "sparse", "partial", "good", "nearly_full", "full"]
    if category not in valid_categories:
        issues.append(f"Invalid category: {category}")
    
    # Category vs score consistency
    category_map = {
        "empty": (0, 1),
        "sparse": (1, 3),
        "partial": (3, 5),
        "good": (5, 7),
        "nearly_full": (7, 9.5),
        "full": (9.5, 10)
    }
    
    expected_min, expected_max = category_map.get(category, (0, 10))
    if not (expected_min <= final_score <= expected_max):
        warnings.append(
            f"Score {final_score} doesn't match category {category} "
            f"(expected {expected_min}-{expected_max})"
        )
    
    # Snack detection validation
    if snack_percent < 0 or snack_percent > 100:
        issues.append(f"snack_percent out of range: {snack_percent}")
    
    # If fill is high, should have high snack percentage
    if fill_percent > 50 and snack_percent < 10:
        warnings.append(
            f"High fill_percent ({fill_percent}) but low snack_percent ({snack_percent}) - "
            "May indicate non-snack products"
        )
    
    return len(issues) == 0, issues, warnings


def test_image(image_path, expected_category=None, debug=False):
    """Test a single image"""
    image_path = Path(image_path)
    
    if not image_path.exists():
        return {
            "image": image_path.name,
            "status": "SKIP",
            "reason": f"Image not found: {image_path}"
        }
    
    print(f"\n{'='*60}")
    print(f"Testing: {image_path.name}")
    print(f"{'='*60}")
    
    result, error = run_visual_analysis(image_path, debug=debug)
    
    if error:
        return {
            "image": image_path.name,
            "status": "ERROR",
            "error": error
        }
    
    valid, issues, warnings = validate_result(result, image_path.name)
    
    print(f"\n📊 Analysis Results:")
    print(f"  Final Score: {result['final_score']}/10")
    print(f"  Category: {result['category'].upper()}")
    print(f"  Fill %: {result['fill_percent']}%")
    print(f"  Snack %: {result['snack_percent']}%")
    print(f"  Vertical: {result['vertical_score']}/10")
    print(f"  Fill Line: {result.get('fill_line_score', 0)}/10")
    
    if result.get('has_fill_line'):
        print(f"  ✓ Fill line detected at Y={result['fill_line_position']}")
    else:
        print(f"  ✗ No fill line detected")
    
    if issues:
        print(f"\n❌ ISSUES FOUND:")
        for issue in issues:
            print(f"  - {issue}")
        return {
            "image": image_path.name,
            "status": "FAIL",
            "issues": issues,
            "result": result
        }
    
    if warnings:
        print(f"\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  - {warning}")
    
    # Check expected category
    if expected_category:
        if result["category"] == expected_category:
            print(f"\n✓ Category matches expected: {expected_category}")
        else:
            print(f"\n⚠️  Category {result['category']} != expected {expected_category}")
    
    return {
        "image": image_path.name,
        "status": "PASS",
        "result": result,
        "warnings": warnings
    }


def main():
    """Main test runner"""
    test_images = [
        # Format: (path, expected_category)
        (Path("dataset/images/train_boot/100%.jpeg"), "full"),
        (Path("dataset/images/train_boot/17%.jpeg"), "sparse"),
        (Path("dataset/images/train_boot/new.jpeg"), "good"),
    ]
    
    results = []
    
    for image_info in test_images:
        if isinstance(image_info, tuple):
            image_path, expected = image_info
        else:
            image_path = image_info
            expected = None
        
        result = test_image(image_path, expected_category=expected, debug=True)
        results.append(result)
    
    # Summary
    print(f"\n\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}\n")
    
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    errors = sum(1 for r in results if r["status"] == "ERROR")
    
    for result in results:
        status_icon = "✓" if result["status"] == "PASS" else "✗" if result["status"] == "FAIL" else "⚠"
        print(f"{status_icon} {result['image']}: {result['status']}")
        if result["status"] == "PASS" and "result" in result:
            print(f"   Score: {result['result']['final_score']}/10 ({result['result']['category']})")
        elif result["status"] == "FAIL":
            for issue in result.get("issues", []):
                print(f"   - {issue}")
    
    print(f"\n📈 Results: {passed} passed, {failed} failed, {errors} errors")
    
    return 0 if failed == 0 and errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
