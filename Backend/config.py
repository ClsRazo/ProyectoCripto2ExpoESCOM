import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'una_clave_muy_secreta_local')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'mysql+pymysql://root:admin@localhost/condoescom')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
