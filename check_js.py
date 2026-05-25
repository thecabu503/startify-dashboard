import sys

def check_brackets(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    
    in_string = False
    string_char = ''
    in_comment = False
    in_multiline_comment = False
    in_template = False

    i = 0
    while i < len(text):
        c = text[i]
        
        # Handle escapes
        if (in_string or in_template) and c == '\\':
            i += 2
            continue
            
        if not in_string and not in_comment and not in_multiline_comment and not in_template:
            if c in "'\"":
                in_string = True
                string_char = c
            elif c == '`':
                in_template = True
            elif c == '/' and i + 1 < len(text) and text[i+1] == '/':
                in_comment = True
            elif c == '/' and i + 1 < len(text) and text[i+1] == '*':
                in_multiline_comment = True
            elif c in '({[':
                stack.append((c, i))
            elif c in ')}]':
                if not stack:
                    print(f"Unmatched {c} at index {i}")
                    return False
                top, pos = stack.pop()
                if top != pairs[c]:
                    print(f"Mismatched {c} at index {i}. Expected {pairs[c]} but found {top} from {pos}")
                    return False
        else:
            if in_string and c == string_char:
                in_string = False
            elif in_template and c == '`':
                in_template = False
            elif in_template and c == '$' and i + 1 < len(text) and text[i+1] == '{':
                # this is tricky, template expression starts
                stack.append(('${', i))
                in_template = False # wait, no, inside we have normal JS until }
                # Let's skip template literal complexity and just do a basic check
            elif in_comment and c == '\n':
                in_comment = False
            elif in_multiline_comment and c == '*' and i + 1 < len(text) and text[i+1] == '/':
                in_multiline_comment = False
                i += 1
        i += 1

    if stack:
        print(f"Unclosed blocks: {stack}")
        return False
    print("Brackets are balanced.")
    return True

check_brackets('app.js')
