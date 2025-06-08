import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'una_clave_muy_secreta_local')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'mysql+pymysql://root:admin@localhost/condoescom')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Configuración de Flask-Mail
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')  # p.ej. tu_correo@gmail.com
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')  # la contraseña o app-password
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', MAIL_USERNAME)