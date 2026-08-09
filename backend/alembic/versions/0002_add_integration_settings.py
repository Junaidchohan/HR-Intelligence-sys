"""add integration settings

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-08

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "integration_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("encrypted_github_token", sa.Text(), nullable=True),
        sa.Column("encrypted_anthropic_api_key", sa.Text(), nullable=True),
        sa.Column("encrypted_openai_api_key", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("integration_settings")
