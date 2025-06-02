from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt, datetime
from models import Usuario
from app import db
from crypto_utils import generar_par_claves_ec, serializar_clave_privada, serializar_clave_publica

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register-condomino', methods=['POST'])
def register_condomino():
    data = request.get_json()
    # ... validar, generar hash, par ECC, guardar clave pública ...
    # ... retornar token y clave privada PEM ...
