#!/bin/bash
# Launch a tmux session with 3 panes:
#   Top-left:  Next.js dev server
#   Top-right: Live git log (refreshes every 2s)
#   Bottom:    Shell

SESSION="niva"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill existing session if any
tmux kill-session -t "$SESSION" 2>/dev/null

tmux new-session -d -s "$SESSION" -c "$DIR"

# Pane 0 (top-left): Next.js dev server
tmux send-keys -t "$SESSION" "npx next dev" C-m

# Split right for git log
tmux split-window -h -t "$SESSION" -c "$DIR"
tmux send-keys -t "$SESSION" "watch -c -n 2 'git log --oneline --graph --all --decorate -20 && echo \"\" && echo \"--- status ---\" && git status --short'" C-m

# Split bottom for shell
tmux split-window -v -t "$SESSION:0.0" -c "$DIR"

# Resize: give the dev server more space
tmux resize-pane -t "$SESSION:0.0" -y 60%
tmux resize-pane -t "$SESSION:0.1" -x 45%

# Focus the shell pane
tmux select-pane -t "$SESSION:0.2"

# Attach
tmux attach -t "$SESSION"
