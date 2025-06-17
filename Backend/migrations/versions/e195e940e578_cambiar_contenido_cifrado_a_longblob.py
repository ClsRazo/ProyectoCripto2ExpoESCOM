"""cambiar_contenido_cifrado_a_longblob

Revision ID: e195e940e578
Revises: 9d6d8e1d4b23
Create Date: 2025-06-17 04:33:53.024235

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e195e940e578'
down_revision = '9d6d8e1d4b23'
branch_labels = None
depends_on = None


def upgrade():
    # Cambiar el tipo de columna contenido_cifrado a LONGBLOB para soportar archivos grandes
    op.execute("ALTER TABLE documentos MODIFY COLUMN contenido_cifrado LONGBLOB")


def downgrade():
    # Revertir a BLOB (aunque puede haber pérdida de datos si hay archivos grandes)
    op.execute("ALTER TABLE documentos MODIFY COLUMN contenido_cifrado BLOB")
