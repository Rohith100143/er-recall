with open('backend/tests/test_api.py', 'r') as f:
    content = f.read()
content = content.replace(
    'corrupt_user = User(username="corrupt_hash", password_hash="plaintext_password", role=RoleEnum.CLINICIAN)\n    db.add(corrupt_user)',
    'corrupt_user = db.query(User).filter(User.username == "corrupt_hash").first()\n    if not corrupt_user:\n        corrupt_user = User(username="corrupt_hash", password_hash="plaintext_password", role=RoleEnum.CLINICIAN)\n        db.add(corrupt_user)'
)
with open('backend/tests/test_api.py', 'w') as f:
    f.write(content)
