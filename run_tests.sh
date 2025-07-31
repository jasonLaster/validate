#!/bin/bash

# Test runner script that invokes both Python and TypeScript test runners
# Usage: ./run_tests.sh

set -e  # Exit on any error

echo "🧪 Running all test suites..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "FAIL")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
    esac
}

# Check if Python is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    print_status "FAIL" "Python not found. Please install Python 3.x"
    exit 1
fi

# Check if Bun is available
if ! command -v bun &> /dev/null; then
    print_status "WARN" "Bun not found. Only Python tests will run."
    RUN_BUN=false
else
    RUN_BUN=true
fi

# Track overall results
PYTHON_PASSED=false
BUN_PASSED=false
OVERALL_SUCCESS=true

echo -e "${BLUE}🐍 Running Python tests...${NC}"
echo "----------------------------------------"

# Run Python tests
if $PYTHON_CMD test_runner.py; then
    print_status "PASS" "Python tests completed successfully"
    PYTHON_PASSED=true
else
    print_status "FAIL" "Python tests failed"
    OVERALL_SUCCESS=false
fi

echo ""

# Run Bun tests if available
if [ "$RUN_BUN" = true ]; then
    echo -e "${BLUE}🦕 Running TypeScript tests...${NC}"
    echo "----------------------------------------"
    
    if bun test_runner.ts; then
        print_status "PASS" "TypeScript tests completed successfully"
        BUN_PASSED=true
    else
        print_status "FAIL" "TypeScript tests failed"
        OVERALL_SUCCESS=false
    fi
else
    print_status "WARN" "Skipping TypeScript tests (Bun not available)"
fi

echo ""
echo "=================================================="
echo -e "${BLUE}📊 Test Summary:${NC}"

# Print individual results
if [ "$PYTHON_PASSED" = true ]; then
    print_status "PASS" "Python: All tests passed"
else
    print_status "FAIL" "Python: Some tests failed"
fi

if [ "$RUN_BUN" = true ]; then
    if [ "$BUN_PASSED" = true ]; then
        print_status "PASS" "TypeScript: All tests passed"
    else
        print_status "FAIL" "TypeScript: Some tests failed"
    fi
else
    print_status "WARN" "TypeScript: Skipped (Bun not available)"
fi

echo ""

# Overall result
if [ "$OVERALL_SUCCESS" = true ]; then
    print_status "PASS" "🎉 All test suites passed!"
    exit 0
else
    print_status "FAIL" "💥 Some test suites failed!"
    exit 1
fi 