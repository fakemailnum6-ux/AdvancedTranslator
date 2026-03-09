from backend.database import init_global_db, init_project_db, save_segment

# Exposing functions for tests directly
__all__ = ["init_global_db", "init_project_db", "save_segment"]