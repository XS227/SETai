"""Existing OAuth Flask application plus private SETAEI analytics pages."""
from app import app
from gbp_dashboard import register_dashboard
register_dashboard(app)