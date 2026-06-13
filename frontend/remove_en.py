import re
import os

catalogs_path = 'd:/2025.2/ITSS_Japanese/JPTaxi/frontend/i18n/catalogs.js'
profile_path = 'd:/2025.2/ITSS_Japanese/JPTaxi/frontend/i18n/profileLanguage.js'

# Update catalogs.js
with open(catalogs_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove 'en: 'en-US','
content = re.sub(r"\s*en:\s*'en-US',", '', content)

# Remove the 'en: { ... },' block in catalogs
# We can find it using a regex that captures everything inside the 'en: {' up to '},' at the root level.
content = re.sub(r"  en: \{\n(?:.|\n)*?  \},\n", '', content)

# Remove ', en: \'...\'' in additionalMessages
content = re.sub(r", en:\s*'[^']*'\s*\}", ' }', content)

with open(catalogs_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Update profileLanguage.js
with open(profile_path, 'r', encoding='utf-8') as f:
    profile_content = f.read()

# Remove { value: 'en' },
profile_content = re.sub(r"\s*\{\s*value:\s*'en'\s*\},", '', profile_content)

# Remove en: '英語', en: 'Tiếng Anh', en: 'English',
profile_content = re.sub(r"\s*en:\s*'[^']*',", '', profile_content)

# Remove the entire en: { ... } block at the end of profileText
profile_content = re.sub(r"  en: \{\n(?:.|\n)*?  \},\n", '', profile_content)

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(profile_content)

print("Done updating catalogs.js and profileLanguage.js")
