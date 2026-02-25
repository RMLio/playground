
#!/bin/bash

# Directory in which to rename subfolders
TARGET_DIR="examples"

# Loop through subdirectories
for dir in "$TARGET_DIR"/RML*; do
    # Skip if no matches
    [ -e "$dir" ] || continue

    # Extract the folder name without the prefix
    base=$(basename "$dir")
    newname="${base#RML}"

    # Rename (move) the folder
    mv "$dir" "$TARGET_DIR/$newname"

    echo "Renamed: $base → $newname"
done
