from flask import Blueprint, request, jsonify
from models import Condominio, CondominioUsuario
from app import db
# ... lógica para crear condominio (solo admin) y unirse (solo condomino) ...

condominios_bp = Blueprint('condominios', __name__)