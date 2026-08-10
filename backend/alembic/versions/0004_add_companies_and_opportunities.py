"""add companies and opportunities tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-10

"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("domain", sa.String(255), nullable=True),
        sa.Column("funding_stage", sa.String(64), nullable=True),
        sa.Column("headcount", sa.Integer(), nullable=True),
        sa.Column("growth_rate", sa.Float(), nullable=True),
        sa.Column("tier", sa.String(16), nullable=True, server_default="B"),
        sa.Column("enrichment_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "opportunities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_archetype", sa.String(255), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(), nullable=False),
        sa.Column("days_open", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("urgency_band", sa.String(64), nullable=True, server_default="Monitor"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("opportunities")
    op.drop_table("companies")
