"""add version and parent_rubric_id to rubrics table for immutable versioning

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-11

"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("rubrics", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("rubrics", sa.Column("parent_rubric_id", sa.Integer(), sa.ForeignKey("rubrics.id", ondelete="SET NULL"), nullable=True))


def downgrade() -> None:
    op.drop_column("rubrics", "parent_rubric_id")
    op.drop_column("rubrics", "version")
