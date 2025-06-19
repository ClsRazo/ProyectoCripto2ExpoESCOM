import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'una_clave_muy_secreta_local')
    
    # Configuración de RDS MySQL
    # En producción usa variables de entorno, en desarrollo usa valores por defecto
    DB_CONFIG = {
        'host': os.getenv('DATABASE_HOST', 'sagitarium-db.c1miq0k0u11p.us-east-2.rds.amazonaws.com'),
        'user': os.getenv('DATABASE_USER', 'admin'),
        'password': os.getenv('DATABASE_PASSWORD', 'JazYZ2u3iEViF10iR1Z8'),
        'database': os.getenv('DATABASE_NAME', 'sagitarium_db'),
        'port': int(os.getenv('DATABASE_PORT', 3306))
    }
    
    # URI de SQLAlchemy para RDS MySQL
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Configuración de CORS
    CORS_ORIGINS = [
        "http://localhost:3000",  # Desarrollo local
        "http://127.0.0.1:3000",  # Desarrollo local alternativo
        "https://sagitarium.vercel.app",  # Producción Vercel (cambiar cuando tengas el dominio)
        "https://*.amazonaws.com",  # S3/CloudFront
        "https://*.s3.amazonaws.com",  # S3 directo
        "https://*.cloudfront.net"  # CloudFront
    ]

    # Configuración de Flask-Mail
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')  # p.ej. tu_correo@gmail.com
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')  # la contraseña o app-password
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', MAIL_USERNAME)
