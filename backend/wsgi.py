"""WSGI entry point used by production hosts such as Render."""
from app import app

__all__ = ["app"]
