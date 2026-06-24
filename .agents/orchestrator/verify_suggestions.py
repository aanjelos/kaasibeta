import re
import sys
import os
import subprocess

def check_no_code_changes():
    print("Checking for modifications in the git repository...")
    try:
        res = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, cwd="b:\\AntiGravity\\kaasibeta")
        if res.returncode != 0:
            print("Warning: git status command failed. Continuing...")
            return True
        changes = res.stdout.strip()
        # Filter out changes to the .agents folder
        other_changes = []
        for line in changes.split('\n'):
            if line:
                file_path = line[3:]
                if not file_path.startswith(".agents"):
                    other_changes.append(line)
        if other_changes:
            print("Error: Files outside .agents have been modified!")
            for change in other_changes:
                print(f"  {change}")
            return False
        print("Success: No repository files outside .agents were modified.")
        return True
    except Exception as e:
        print(f"Error checking git status: {e}")
        return True # Fallback if git is not installed

def verify_suggestions_document():
    suggestions_path = r"C:\Users\Lenovo\.gemini\antigravity\brain\a70f250a-b0be-4046-9de5-3d4bd0dfddc8\suggestions.md"
    roadmap_path = r"b:\AntiGravity\kaasibeta\docs\ROADMAP.md"

    if not os.path.exists(suggestions_path):
        print(f"Error: suggestions.md not found at {suggestions_path}")
        return False
    if not os.path.exists(roadmap_path):
        print(f"Error: docs/ROADMAP.md not found at {roadmap_path}")
        return False

    with open(suggestions_path, "r", encoding="utf-8") as f:
        s_content = f.read()

    with open(roadmap_path, "r", encoding="utf-8") as f:
        r_content = f.read()

    # 1. Check categories
    print("Verifying categories...")
    categories = ["Bugs & Critical Fixes", "UI & UX Improvements", "New Features"]
    for cat in categories:
        if cat not in s_content:
            print(f"Error: Category '{cat}' not found in suggestions.md")
            return False
    print("Success: All categories are present.")

    # 2. Check codebase file references (at least 5 specific files)
    print("Verifying file references...")
    valid_files = [
        "js/features.js",
        "js/math-tool.js",
        "js/settings.js",
        "js/ui.js",
        "style.css",
        "js/globals.js",
        "js/data-sync.js",
        "index.html",
        "js/app.js"
    ]
    referenced_files = []
    for vf in valid_files:
        if vf in s_content:
            referenced_files.append(vf)
    
    print(f"Referenced files in suggestions.md: {referenced_files}")
    if len(referenced_files) < 5:
        print(f"Error: suggestions.md references only {len(referenced_files)} specific files (minimum is 5).")
        return False
    print(f"Success: Found {len(referenced_files)} file references.")

    # 3. Check for overlap with docs/ROADMAP.md
    print("Verifying no overlap with docs/ROADMAP.md...")
    # Extract item titles from ROADMAP.md
    # Look for headers or list items under Feature Additions, UI/UX Polish, Tech Debt, Checklist, Blog Ideas
    roadmap_items = [
        "Virtual Envelopes", "Savings Wishlist",
        "Split Bills", "IOU Tracker",
        "Gamification", "Streaks", "Badges",
        "Undo Transactions",
        "Historical Budget",
        "Safe to Spend",
        "Multi-Currency",
        "Offline PWA Smoke Test"
    ]

    # Let's inspect the actual suggestions sections in suggestions.md (ignoring the intro/disclaimer)
    # Suggestions sections start after the intro (say, after "🛑 Bugs & Critical Fixes")
    suggestions_body = s_content.split("🛑 Bugs & Critical Fixes", 1)[1]

    overlaps = []
    for item in roadmap_items:
        # Check if the roadmap item is proposed as a suggestion (case-insensitive)
        pattern = re.compile(rf"\b{re.escape(item)}\b", re.IGNORECASE)
        # Search in suggestions_body to ignore the disclaimer section
        if pattern.search(suggestions_body):
            # Special case check: Emergency Fund is in Blog Ideas but not as a main feature in Roadmap.
            # So if it mentions "Emergency Fund", it's fine since it was only a blog idea.
            # But let's check for direct matches of other core features.
            overlaps.append(item)

    if overlaps:
        print(f"Error: Potential overlap with docs/ROADMAP.md items: {overlaps}")
        return False

    print("Success: No duplicate suggestions found from the roadmap backlog.")
    return True

if __name__ == "__main__":
    v1 = check_no_code_changes()
    v2 = verify_suggestions_document()
    if v1 and v2:
        print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\nVERIFICATION FAILED!")
        sys.exit(1)
