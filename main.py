import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.main import app
```

And create `nmu-advisor-portal/requirements.txt`:
```
fastapi
uvicorn
sqlalchemy
alembic
psycopg2-binary
python-jose
passlib
bcrypt==4.0.1
python-multipart
pandas
openpyxl
supabase
anthropic
python-dotenv