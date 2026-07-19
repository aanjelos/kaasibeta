import os
import re

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Replace text colors
    content = re.sub(r'\btext-gray-300\b', 'text-[var(--text-secondary)]', content)
    content = re.sub(r'\btext-gray-400\b', 'text-[var(--text-secondary)]', content)
    content = re.sub(r'\btext-gray-500\b', 'text-[var(--text-placeholder)]', content)

    # Replace border colors
    content = re.sub(r'\bborder-gray-500\b', 'border-[var(--border-color)]', content)
    content = re.sub(r'\bborder-gray-600\b', 'border-[var(--border-color)]', content)
    content = re.sub(r'\bborder-gray-700\b', 'border-[var(--border-color)]', content)

    # Replace backgrounds (and add borders for depth)
    content = re.sub(r'\bbg-gray-600\b', 'bg-[var(--bg-tertiary)] border border-[var(--border-color)]', content)
    content = re.sub(r'\bbg-gray-700\b', 'bg-[var(--bg-tertiary)] border border-[var(--border-color)]', content)
    content = re.sub(r'\bbg-gray-800\b', 'bg-[var(--bg-secondary)] border border-[var(--border-color)]', content)
    
    # Progress bars and toggles track
    content = re.sub(r'\bbg-gray-500\b', 'bg-[var(--bg-secondary)] border border-[var(--border-color)]', content)
    
    # Clean up double borders if they accidentally duplicated
    content = content.replace('border border-theme', 'border-[var(--border-color)]')
    content = content.replace('border border border-[var(--border-color)]', 'border border-[var(--border-color)]')
    content = content.replace('border border-[var(--border-color)] border-[var(--border-color)]', 'border border-[var(--border-color)]')
    content = content.replace('border border-[var(--border-color)] border border-[var(--border-color)]', 'border border-[var(--border-color)]')

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('.'):
    if '.git' in root or 'tailwind' in root or 'node_modules' in root:
        continue
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            replace_in_file(os.path.join(root, file))
