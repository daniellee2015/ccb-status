#!/bin/bash
# attach-to-orphaned.sh
# 为 Orphaned 实例创建一个监控 pane，使其变成 Active 状态

WORK_DIR="$1"
PROJECT_NAME=$(basename "$WORK_DIR")

# 检查是否有 askd.json
STATE_FILE=$(find ~/.cache/ccb/projects -name "askd.json" -exec grep -l "\"work_dir\": \"$WORK_DIR\"" {} \;)

if [ -z "$STATE_FILE" ]; then
  echo "Error: No state file found for $WORK_DIR"
  exit 1
fi

# 读取 PID 和端口
ASKD_PID=$(jq -r '.pid' "$STATE_FILE")
PORT=$(jq -r '.port' "$STATE_FILE")

# 检查进程是否在运行
if ! ps -p "$ASKD_PID" > /dev/null 2>&1; then
  echo "Error: askd process $ASKD_PID is not running"
  exit 1
fi

# 创建新的 tmux session 或 window
SESSION_NAME="CCB-$PROJECT_NAME"

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  # Session 已存在，创建新 window
  tmux new-window -t "$SESSION_NAME" -n "Monitor"
else
  # 创建新 session
  tmux new-session -d -s "$SESSION_NAME" -n "Monitor"
fi

# 在新 pane 中 cd 到工作目录
tmux send-keys -t "$SESSION_NAME:Monitor" "cd '$WORK_DIR'" Enter

# 显示实例信息
tmux send-keys -t "$SESSION_NAME:Monitor" "clear" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo '=== CCB Instance Monitor ==='" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo 'Work Dir: $WORK_DIR'" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo 'askd PID: $ASKD_PID'" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo 'Port: $PORT'" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo 'This pane monitors the orphaned CCB instance.'" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo 'The instance is now Active.'" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo ''" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo 'Commands:'" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo '  ccb-status - Check status'" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo '  tail -f ~/.cache/ccb/projects/*/askd.log - View logs'" Enter
tmux send-keys -t "$SESSION_NAME:Monitor" "echo '  kill $ASKD_PID - Stop instance'" Enter

echo "✓ Created monitor pane for $PROJECT_NAME"
echo "  To attach: tmux attach -t $SESSION_NAME"
