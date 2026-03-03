from flask import Flask
from flask_login import LoginManager
from config import Config
from models import db
from routes import auth_bp, login_manager
from routes.search import search_bp

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'auth.google_auth'

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(search_bp, url_prefix='/api')

with app.app_context():
    db.create_all()

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)
