# Criminal Sketch Generator

## Simple Streamlit Frontend

Install dependencies with uv:

```powershell
.\.venv\Scripts\python.exe -m uv pip install -r requirements.txt
```

Run Streamlit app:

```powershell
.\.venv\Scripts\python.exe -m streamlit run frontend/streamlit_app.py
```

Optional backend URL override:

```powershell
$env:BACKEND_URL="http://localhost:5000"
.\.venv\Scripts\python.exe -m streamlit run frontend/streamlit_app.py
```

The app expects backend endpoint:
- `POST /generate-image-api`
