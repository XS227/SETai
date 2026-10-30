"""Offline functional test of the unified private Control Room blueprint.
Run with the existing SETAEI OAuth venv. No Google calls or credentials used.
"""
import os
import sys
from pathlib import Path
from flask import Flask

root=Path(__file__).resolve().parent
sys.path.insert(0,str(root))
from setai_control_room import register_control_room
app=Flask('setaei_control_room_test')
app.secret_key='test-only-do-not-deploy'
register_control_room(app)
routes=(
    '/seo/google/control-room',
    '/seo/google/control-room/',
    '/seo/google/control-room.js',
    '/seo/google/control-room.css',
)
with app.test_client() as client:
    for route in routes:
        response=client.get(route)
        assert response.status_code==403,(route,response.status_code)
    with client.session_transaction() as sess:
        sess['admin']=True
    for route in routes:
        response=client.get(route)
        assert response.status_code==200,(route,response.status_code,response.data[:100])
        assert response.headers['Cache-Control']=='private, no-store',(route,response.headers)
    page=client.get('/seo/google/control-room')
    html=page.get_data(as_text=True)
    assert 'SETAEI Control Room' in html
    assert 'data-panel="overview"' in html and 'data-panel="seo"' in html
    assert 'data-panel="google"' in html and 'data-panel="clients"' in html
    assert "script-src 'self'" in page.headers.get('Content-Security-Policy','')
    assert 'frame-src \'self\'' in page.headers.get('Content-Security-Policy','')
    js=client.get('/seo/google/control-room.js').get_data(as_text=True)
    assert '/seo/google/api/dashboard' in js
    assert 'bilvaskexpress' in js and 'setaei' in js
    assert 'innerHTML=' not in js
print('CONTROL_ROOM_TESTS_OK: anonymous access denied, authenticated assets work, CSP and client API isolation')
