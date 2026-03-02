from flask import Blueprint, redirect, request, jsonify, current_app, session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from models import db, User
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import os

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

auth_bp = Blueprint('auth', __name__)
login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@auth_bp.route('/google')
def google_auth():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'openid']
    )
    flow.redirect_uri = request.host_url.rstrip('/') + '/auth/callback'
    authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='consent')
    session['state'] = state
    return redirect(authorization_url)

@auth_bp.route('/callback')
def callback():
    state = session.get('state')
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'openid'],
        state=state
    )
    flow.redirect_uri = request.host_url.rstrip('/') + '/auth/callback'
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials
    
    oauth2_service = build('oauth2', 'v2', credentials=credentials)
    user_info = oauth2_service.userinfo().get().execute()
    
    google_id = user_info['id']
    email = user_info['email']
    
    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        user = User(google_id=google_id, email=email)
        db.session.add(user)
    
    user.access_token = credentials.token
    user.refresh_token = credentials.refresh_token
    db.session.commit()
    
    login_user(user)
    return redirect('http://localhost:3000')

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return {'status': 'logged out'}

@auth_bp.route('/me')
@login_required
def me():
    return {'email': current_user.email, 'id': current_user.id}
