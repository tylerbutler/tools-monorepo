Output demo.gif
Set Width 2400
Set Height 600
Set Theme "Dracula"

# Start zellij with horizontal split
Type "zellij"
Enter
Sleep 2s

# Create vertical split with Ctrl+p then n
Type "Ctrl+p"
Type "n"
Sleep 1s

# Left pane - plain CCL
Type "cat simple.ccl"
Enter
Sleep 3s

# Switch to right pane with Tab
Type "Tab"
Sleep 1s

# Right pane - highlighted CCL  
Type "bat simple.ccl --language ccl"
Enter
Sleep 3s

# Final pause
Sleep 2s