"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-08

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "recruiter", name="userrole"), nullable=False, server_default="recruiter"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "candidates",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("full_name", sa.String(255)),
        sa.Column("primary_email", sa.String(255)),
        sa.Column("location", sa.String(255)),
        sa.Column("bio", sa.Text),
        sa.Column("skills", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_candidates_primary_email", "candidates", ["primary_email"])

    op.create_table(
        "candidate_identities",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("username", sa.String(255)),
        sa.Column("raw_payload", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("resolution_reason", sa.String(64)),
        sa.Column("resolution_confidence", sa.Float),
        sa.Column("candidate_id", sa.Integer, sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("ingested_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("source", "source_id", name="uq_source_identity"),
    )

    op.create_table(
        "evidence",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("candidate_id", sa.Integer, sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("evidence_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(500)),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("snippet", sa.Text),
        sa.Column("collected_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "citation_checks",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("evidence_id", sa.Integer, sa.ForeignKey("evidence.id"), nullable=False),
        sa.Column("claimed_skill", sa.String(255)),
        sa.Column("url_well_formed", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("claim_supported", sa.Boolean),
        sa.Column("valid", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("notes", sa.Text),
        sa.Column("checked_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "rubrics",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("criteria", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "job_requisitions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("rubric_id", sa.Integer, sa.ForeignKey("rubrics.id"), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "screenings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("candidate_id", sa.Integer, sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("job_id", sa.Integer, sa.ForeignKey("job_requisitions.id"), nullable=False),
        sa.Column("overall_score", sa.Float, nullable=False),
        sa.Column("recommendation", sa.String(64), nullable=False),
        sa.Column("criterion_scores", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("summary", sa.Text),
        sa.Column("citation_valid_ratio", sa.Float),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("entity_id", sa.String(64)),
        sa.Column("details", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "background_jobs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("job_type", sa.String(64), nullable=False),
        sa.Column("payload", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("status", sa.Enum("pending", "running", "done", "failed", name="jobstatus"), nullable=False, server_default="pending"),
        sa.Column("result", sa.JSON),
        sa.Column("error", sa.Text),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("background_jobs")
    op.drop_table("audit_logs")
    op.drop_table("screenings")
    op.drop_table("job_requisitions")
    op.drop_table("rubrics")
    op.drop_table("citation_checks")
    op.drop_table("evidence")
    op.drop_table("candidate_identities")
    op.drop_index("ix_candidates_primary_email", table_name="candidates")
    op.drop_table("candidates")
    op.drop_table("users")
