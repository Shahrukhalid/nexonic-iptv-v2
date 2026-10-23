import os
import tempfile

# Tests use a throwaway data folder and never download playlists.
os.environ.setdefault("NEXONIC_DATA_DIR", tempfile.mkdtemp(prefix="nexonic-test-"))
os.environ["NEXONIC_SKIP_INITIAL_IMPORT"] = "1"
