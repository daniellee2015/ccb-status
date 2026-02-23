#!/bin/bash
# CCB Status - Kill & Cleanup 功能测试脚本

echo "=== CCB Status Kill & Cleanup 功能测试 ==="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 测试计数
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_file_exists() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

test_function_exists() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if grep -q "$2" "$1"; then
        echo -e "${GREEN}✓${NC} Function exists in $1: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} Function missing in $1: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

test_translation_exists() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if grep -q "$2" "$1"; then
        echo -e "${GREEN}✓${NC} Translation exists in $1: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} Translation missing in $1: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "1. 检查菜单文件是否存在..."
echo ""
test_file_exists "src/cli/menus/kill-active.js"
test_file_exists "src/cli/menus/kill-zombie.js"
test_file_exists "src/cli/menus/kill-all.js"
test_file_exists "src/cli/menus/cleanup-dead.js"
test_file_exists "src/cli/menus/cleanup-zombie.js"
test_file_exists "src/cli/menus/cleanup-all.js"

echo ""
echo "2. 检查函数导出..."
echo ""
test_function_exists "src/cli/menus/kill-active.js" "showKillActive"
test_function_exists "src/cli/menus/kill-zombie.js" "showKillZombie"
test_function_exists "src/cli/menus/kill-all.js" "showKillAll"
test_function_exists "src/cli/menus/cleanup-dead.js" "showCleanupDead"
test_function_exists "src/cli/menus/cleanup-zombie.js" "showCleanupZombie"
test_function_exists "src/cli/menus/cleanup-all.js" "showCleanupAll"

echo ""
echo "3. 检查 bin/ccb-status.js 中的导入..."
echo ""
test_function_exists "bin/ccb-status.js" "showKillActive"
test_function_exists "bin/ccb-status.js" "showKillZombie"
test_function_exists "bin/ccb-status.js" "showKillAll"
test_function_exists "bin/ccb-status.js" "showCleanupDead"
test_function_exists "bin/ccb-status.js" "showCleanupZombie"
test_function_exists "bin/ccb-status.js" "showCleanupAll"

echo ""
echo "4. 检查英文翻译..."
echo ""
test_translation_exists "src/i18n/languages/en.js" "killActive:"
test_translation_exists "src/i18n/languages/en.js" "killZombie:"
test_translation_exists "src/i18n/languages/en.js" "killAll:"
test_translation_exists "src/i18n/languages/en.js" "cleanupDead:"
test_translation_exists "src/i18n/languages/en.js" "cleanupZombie:"
test_translation_exists "src/i18n/languages/en.js" "cleanupAll:"

echo ""
echo "5. 检查中文翻译..."
echo ""
test_translation_exists "src/i18n/languages/zh.js" "killActive:"
test_translation_exists "src/i18n/languages/zh.js" "killZombie:"
test_translation_exists "src/i18n/languages/zh.js" "killAll:"
test_translation_exists "src/i18n/languages/zh.js" "cleanupDead:"
test_translation_exists "src/i18n/languages/zh.js" "cleanupZombie:"
test_translation_exists "src/i18n/languages/zh.js" "cleanupAll:"

echo ""
echo "6. 检查安全实现细节..."
echo ""
test_function_exists "src/cli/menus/kill-active.js" "safeKillProcess"
test_function_exists "src/cli/menus/kill-zombie.js" "safeKillProcess"
test_function_exists "src/cli/menus/kill-all.js" "safeKillProcess"
test_function_exists "src/cli/menus/cleanup-dead.js" "validateWorkDir"
test_function_exists "src/cli/menus/cleanup-zombie.js" "validateWorkDir"
test_function_exists "src/cli/menus/cleanup-all.js" "safeKillProcess"
test_function_exists "src/cli/menus/cleanup-dead.js" "fs.unlink"
test_function_exists "src/cli/menus/cleanup-zombie.js" "fs.unlink"
test_function_exists "src/cli/menus/cleanup-all.js" "fs.unlink"
test_file_exists "src/utils/pid-validator.js"

echo ""
echo "7. 检查菜单集成..."
echo ""
test_function_exists "bin/ccb-status.js" "Kill Active Instances"
test_function_exists "bin/ccb-status.js" "Kill Zombie Instances"
test_function_exists "bin/ccb-status.js" "Kill All Instances"
test_function_exists "bin/ccb-status.js" "Cleanup Dead States"
test_function_exists "bin/ccb-status.js" "Cleanup Zombie States"
test_function_exists "bin/ccb-status.js" "Cleanup All States"

echo ""
echo "=== 测试结果 ==="
echo -e "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 有 ${FAILED_TESTS} 个测试失败${NC}"
    exit 1
fi
