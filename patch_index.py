import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove mobile transfer button
html = re.sub(r'<!-- Transfer Money -->.*?</div>\s*<!-- Export Backup -->', '<!-- Export Backup -->', html, flags=re.DOTALL)

# 2. Add transfer option
html = html.replace(
    '<option value="income">Income</option>',
    '<option value="income">Income</option>\n                    <option value="transfer">Transfer</option>'
)

# 3. Replace account group and add transfer groups
account_block = """                <div>
                  <label for="account" class="block text-sm font-medium mb-1"
                    >Account</label
                  ><select id="account" name="account" required aria-label="Account"></select>
                </div>
                <div id="categoryGroup">
                  <label for="category" class="block text-sm font-medium mb-1"
                    >Category</label
                  ><select id="category" name="category" required aria-label="Category"></select>
                </div>"""

new_account_block = """                <div id="normalAccountGroup">
                  <label for="account" class="block text-sm font-medium mb-1">Account</label>
                  <select id="account" name="account" aria-label="Account"></select>
                </div>
                <div id="transferAccountsGroup" class="hidden grid grid-cols-2 gap-2">
                  <div>
                    <label for="transferFrom" class="block text-sm font-medium mb-1">From</label>
                    <select id="transferFrom" name="transferFrom" aria-label="From Account"></select>
                  </div>
                  <div>
                    <label for="transferTo" class="block text-sm font-medium mb-1">To</label>
                    <select id="transferTo" name="transferTo" aria-label="To Account"></select>
                  </div>
                </div>
                <div id="transferFeeGroup" class="hidden">
                  <label for="transferFee" class="block text-sm font-medium mb-1">Bank Transfer Fee (LKR)</label>
                  <div class="relative flex items-center w-full">
                    <input type="text" inputmode="decimal" autocomplete="off" class="calc-amount pr-8 w-full !py-2 !px-3 border border-gray-600 bg-gray-700 rounded-md text-white focus:outline-none focus:border-accent-500" id="transferFee" name="transferFee" step="0.01" min="0" placeholder="e.g., 25.00" aria-label="Transfer Fee">
                    <button type="button" class="calc-toggle-btn absolute right-4 text-gray-300 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1" aria-label="Toggle Calculator">
                      <i class="fas fa-calculator"></i>
                    </button>
                  </div>
                </div>
                <div id="categoryGroup">
                  <label id="categoryLabel" for="category" class="block text-sm font-medium mb-1">Category</label>
                  <select id="category" name="category" required aria-label="Category"></select>
                </div>"""

html = html.replace(account_block, new_account_block)

# 4. Remove dashboard transfer button
html = re.sub(
    r'<button\s*id="openTransferModalBtn"[\s\S]*?</button>',
    '',
    html
)

# 5. Remove transfer modal entirely
html = re.sub(
    r'<div id="transferMoneyModal".*?<!-- Summary Cards -->',
    '<!-- Summary Cards -->',
    html,
    flags=re.DOTALL
)
# Note: The above regex looks for transferMoneyModal and deletes everything until the next modal's inner content (ccHistoryModal).
# Let's be more precise. transferMoneyModal ends right before `<div id="ccHistoryModal"`
html = re.sub(
    r'<div id="transferMoneyModal".*?<div id="ccHistoryModal"',
    '<div id="ccHistoryModal"',
    html,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html patched.")
