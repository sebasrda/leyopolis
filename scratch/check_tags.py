import re

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove self-closing tags
    content = re.sub(r'<[a-zA-Z0-9]+\s+[^>]*/>', '', content)
    content = re.sub(r'<(Input|Search|Plus|FileText|ImageIcon|Loader2|Upload|Sparkles|Trash2|Clock|CheckCircle2|AlertCircle|Switch|Badge|Label|SelectValue|SelectTrigger|Separator|Skeleton|br|hr|img)\s+[^>]*>', '', content)
    content = re.sub(r'<(Input|Search|Plus|FileText|ImageIcon|Loader2|Upload|Sparkles|Trash2|Clock|CheckCircle2|AlertCircle|Switch|Badge|Label|SelectValue|SelectTrigger|Separator|Skeleton|br|hr|img)>', '', content)

    tags = re.findall(r'</?([a-zA-Z0-9]+)', content)
    stack = []
    for tag in tags:
        if tag.lower() in ['input', 'search', 'plus', 'filetext', 'imageicon', 'loader2', 'upload', 'sparkles', 'trash2', 'clock', 'checkcircle2', 'alertcircle', 'switch', 'badge', 'label', 'selectvalue', 'selecttrigger', 'separator', 'skeleton', 'br', 'hr', 'img']:
            continue
        
        if content.find('</' + tag) == -1 and content.find('<' + tag + ' ') == -1:
             # Likely a JS variable or something else caught by regex
             continue

        # This is a very rough check
        pass

    # Better check: just count
    open_div = content.count('<div')
    close_div = content.count('</div>')
    open_dialog = content.count('<Dialog')
    close_dialog = content.count('</Dialog>')
    open_card = content.count('<Card')
    close_card = content.count('</Card>')
    
    print(f"div: {open_div} vs {close_div}")
    print(f"Dialog: {open_dialog} vs {close_dialog}")
    print(f"Card: {open_card} vs {close_card}")

check_tags('src/app/dashboard/admin/books/page.tsx')
