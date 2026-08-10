"""add touches table for outreach event tracking

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-11

"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "touches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entity_type", sa.String(32), nullable=False, index=True),
        sa.Column("entity_id", sa.Integer(), nullable=False, index=True),
        sa.Column("channel", sa.String(64), nullable=False),
        sa.Column("outcome", sa.String(128), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("touches")
