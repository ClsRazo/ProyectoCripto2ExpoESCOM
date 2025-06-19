import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'una_clave_muy_secreta_local')
    
    # Configuración de RDS MySQL
    DB_CONFIG = {
        'host': 'sagitarium-db.c1miq0k0u11p.us-east-2.rds.amazonaws.com',  # Tu endpoint RDS
        'user': 'admin',
        'password': 'JazYZ2u3iEViF10iR1Z8',
        'database': 'sagitarium_db',
        'port': 3306
    }
      # URI de SQLAlchemy para RDS MySQL con configuraciones de pool
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset=utf8mb4"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuraciones adicionales para conexiones de BD estables
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 120,  # Reciclar conexiones cada 2 minutos
        'pool_pre_ping': True,  # Verificar conexiones antes de usarlas
        'pool_timeout': 20,
        'max_overflow': 0
    }

    # Configuración de Flask-Mail
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')  # p.ej. tu_correo@gmail.com
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')  # la contraseña o app-password
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', MAIL_USERNAME)

    # Configuración de CORS
    CORS_ORIGINS = [
        "http://localhost:3000",  # Desarrollo local
        "http://127.0.0.1:3000",  # Desarrollo local alternativo
        "http://3.136.236.195",  # Tu EC2 (reemplaza con tu IP pública)
        "https://sagitarium.vercel.app",  # Producción Vercel (cambiar cuando tengas el dominio)
        "https://*.amazonaws.com",  # S3/CloudFront
        "https://*.s3.amazonaws.com",  # S3 directo
        "https://*.cloudfront.net"  # CloudFront
    ]