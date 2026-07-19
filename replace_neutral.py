import os

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Replace all gray with neutral for bg, text, border, ring, divide
    content = content.replace('bg-gray-', 'bg-neutral-')
    content = content.replace('text-gray-', 'text-neutral-')
    content = content.replace('border-gray-', 'border-neutral-')
    content = content.replace('ring-gray-', 'ring-neutral-')
    content = content.replace('divide-gray-', 'divide-neutral-')

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
